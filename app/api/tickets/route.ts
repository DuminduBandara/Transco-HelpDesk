import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { createTicketSchema, ticketQuerySchema } from "@/lib/validators";
import { generateTicketId } from "@/lib/ticketId";
import { sendEmail } from "@/lib/email";
import type { Ticket } from "@/types";

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

import {
  buildTicketCreatedStaffEmail,
  buildTicketCreatedAdminEmail,
} from "@/lib/emailTemplates";

// Background asynchronous email dispatch for ticket creation (Initial thread email)
async function sendTicketCreatedEmails(params: {
  ticketId: string;
  title: string;
  description: string;
  priority: string;
  categoryId?: number | null;
  userName: string;
  userEmail: string;
}) {
  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

  // Lookup category name if available
  let categoryName: string | undefined;
  if (params.categoryId) {
    const cats = await query<{ name: string }>(
      "SELECT name FROM categories WHERE id = ? LIMIT 1",
      [params.categoryId]
    );
    categoryName = cats[0]?.name;
  }

  const subject = `[Ticket #${params.ticketId}] ${params.title}`;

  // 1. Send confirmation email to staff member (Root email of the ticket thread)
  const staffEmail = buildTicketCreatedStaffEmail({
    ticketId: params.ticketId,
    title: params.title,
    description: params.description,
    priority: params.priority,
    categoryName,
    userName: params.userName,
    appUrl,
  });

  const staffResult = await sendEmail(
    params.userEmail,
    staffEmail.subject,
    staffEmail.html,
    {
      text: staffEmail.text,
      ticketId: params.ticketId,
      isReply: false,
    }
  );

  if (!staffResult.success) {
    console.warn(
      `[Email Warning] Could not deliver 1st ticket confirmation to ${params.userEmail}:`,
      staffResult.error
    );
  }

  // 2. Fetch all other active admins to notify them (excluding the ticket creator)
  const admins = await query<{ email: string }>(
    "SELECT email FROM users WHERE role = 'admin' AND is_active = 1"
  );

  const otherAdmins = (admins || [])
    .map((a) => a.email.trim())
    .filter(
      (email) =>
        email.length > 0 &&
        email.toLowerCase() !== params.userEmail.trim().toLowerCase()
    );

  if (otherAdmins.length > 0) {
    const adminEmail = buildTicketCreatedAdminEmail({
      ticketId: params.ticketId,
      title: params.title,
      description: params.description,
      priority: params.priority,
      categoryName,
      creatorName: params.userName,
      creatorEmail: params.userEmail,
      appUrl,
    });

    await Promise.all(
      otherAdmins.map((adminEmailAddr) =>
        sendEmail(adminEmailAddr, adminEmail.subject, adminEmail.html, {
          text: adminEmail.text,
          ticketId: params.ticketId,
          isReply: true,
        })
      )
    );
  }
}

// GET /api/tickets — list tickets, scoped by role, filterable, paginated.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ticketQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { search, status, priority, category_id, assigned_to, page, pageSize } =
    parsed.data;

  const where: string[] = [];
  const params: unknown[] = [];

  // Only admins are allowed to view all tickets across the platform.
  // All other users strictly see only their own submitted tickets.
  if (user.role !== "admin") {
    where.push("t.created_by = ?");
    params.push(user.id);
  }

  if (search) {
    const cleanSearch = search.trim().replace(/^#/, "");
    where.push("(t.id LIKE ? OR t.title LIKE ? OR t.description LIKE ?)");
    params.push(`%${cleanSearch}%`, `%${cleanSearch}%`, `%${cleanSearch}%`);
  }

  if (status) {
    where.push("t.status = ?");
    params.push(status);
  }
  if (priority) {
    where.push("t.priority = ?");
    params.push(priority);
  }
  if (category_id) {
    where.push("t.category_id = ?");
    params.push(category_id);
  }
  if (assigned_to) {
    where.push("t.assigned_to = ?");
    params.push(assigned_to);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  const rows = await query<Ticket & { total: number }>(
    `SELECT
       t.id, t.title, t.description, t.status, t.priority,
       t.category_id, c.name AS category_name,
       t.created_by, cu.name AS created_by_name, cu.email AS created_by_email, cu.mobile_number AS created_by_mobile,
       t.assigned_to, au.name AS assigned_to_name, au.email AS assigned_to_email, au.mobile_number AS assigned_to_mobile,
       t.created_at, t.updated_at, t.resolved_at,
       COUNT(*) OVER() AS total
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users cu ON cu.id = t.created_by
     LEFT JOIN users au ON au.id = t.assigned_to
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const total = rows[0]?.total ?? 0;
  const tickets = rows.map(({ total: _t, ...rest }) => rest);

  return NextResponse.json({ tickets, total, page, pageSize });
}

// POST /api/tickets — any authenticated user creates a ticket for themself.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { title, description, priority, category_id } = parsed.data;

  // Ensure creatorId exists in MySQL users table (resolves FK constraint)
  let creatorId = user.id;
  const userCheck = await query<{ id: number }>(
    "SELECT id FROM users WHERE id = ? LIMIT 1",
    [creatorId]
  );
  if (!userCheck || userCheck.length === 0) {
    const userByEmail = await query<{ id: number }>(
      "SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1",
      [user.email.toLowerCase()]
    );
    if (userByEmail && userByEmail[0]) {
      creatorId = userByEmail[0].id;
    }
  }

  // Ensure category_id exists or is null to avoid FK constraint error
  let validCategoryId: number | null = null;
  if (category_id) {
    const catCheck = await query<{ id: number }>(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [category_id]
    );
    if (catCheck && catCheck.length > 0) {
      validCategoryId = catCheck[0].id;
    }
  }

  // Auto-generate ticket ID with concurrency retry on duplicate entry
  let finalTicketId = "";
  let inserted = false;
  let attempts = 0;

  while (!inserted && attempts < 5) {
    attempts++;
    finalTicketId = generateTicketId();
    try {
      await execute(
        `INSERT INTO tickets (id, title, description, priority, category_id, created_by, status)
         VALUES (?, ?, ?, ?, ?, ?, 'open')`,
        [finalTicketId, title, description, priority, validCategoryId, creatorId]
      );
      inserted = true;
    } catch (err: any) {
      const isDuplicate =
        err?.code === "ER_DUP_ENTRY" ||
        err?.message?.includes("Duplicate entry") ||
        err?.message?.includes("PRIMARY");

      if (isDuplicate && attempts < 5) {
        continue;
      }
      throw err;
    }
  }

  // Asynchronous non-blocking email dispatch
  sendTicketCreatedEmails({
    ticketId: finalTicketId,
    title,
    description,
    priority,
    categoryId: validCategoryId,
    userName: user.name,
    userEmail: user.email,
  }).catch((error) => {
    console.error(`[Email Error] Failed sending new ticket notification for #${finalTicketId}:`, error);
  });

  return NextResponse.json({ id: finalTicketId }, { status: 201 });
}