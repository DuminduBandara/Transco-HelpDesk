import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { createTicketSchema, ticketQuerySchema } from "@/lib/validators";
import { generateTicketId } from "@/lib/ticketId";
import { sendEmail } from '@/lib/email';
import type { Ticket } from "@/types";

// GET /api/tickets — list tickets, scoped by role, filterable, paginated.
//   employee -> only their own tickets
//   agent/admin -> all tickets
// Query params: status, priority, category_id, assigned_to, page, pageSize
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
  // All other users (staff, agents, employees) strictly see only their own submitted tickets.
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

  // Auto-generate unique 6-character ticket ID (2 uppercase letters + 4 digits)
  let ticketId = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateTicketId();
    const existing = await query<{ id: string }>(
      "SELECT id FROM tickets WHERE id = ? LIMIT 1",
      [candidate]
    );
    if (!existing || existing.length === 0) {
      ticketId = candidate;
      break;
    }
  }
  if (!ticketId) {
    ticketId = generateTicketId();
  }

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

  await execute(
    `INSERT INTO tickets (id, title, description, priority, category_id, created_by, status)
     VALUES (?, ?, ?, ?, ?, ?, 'open')`,
    [ticketId, title, description, priority, validCategoryId, creatorId]
  );

  // --- EMAIL NOTIFICATION TRIGGER ---
  try {
    // 1. Notify the User who created the ticket
    const userEmailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #0056b3;">Ticket Submitted Successfully: #${ticketId}</h2>
        <p>Hi ${user.name},</p>
        <p>We have received your ticket and our team will review it shortly. Here are the details you submitted:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${title}</h3>
          <p style="margin-bottom: 0; white-space: pre-wrap;">${description}</p>
          <br/>
          <p style="margin-bottom: 0;"><strong>Priority:</strong> <span style="text-transform: uppercase;">${priority}</span></p>
        </div>
        <p>We will notify you via email when there is an update to your ticket status.</p>
      </div>
    `;
    await sendEmail(user.email, `Ticket Submitted: #${ticketId} - ${title}`, userEmailHtml);

    // 2. Fetch all active admins to notify them of the new ticket
    const admins = await query<{ email: string }>(
      "SELECT email FROM users WHERE role = 'admin' AND is_active = 1"
    );

    if (admins && admins.length > 0) {
      const adminEmailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #0056b3;">New Ticket Created: #${ticketId}</h2>
          <p>A new ticket has been submitted by <strong>${user.name}</strong> (${user.email}).</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${title}</h3>
            <p style="margin-bottom: 0; white-space: pre-wrap;">${description}</p>
            <br/>
            <p style="margin-bottom: 0;"><strong>Priority:</strong> <span style="text-transform: uppercase;">${priority}</span></p>
          </div>
          <p>Please log in to the Transco HelpDesk to review and assign this ticket.</p>
        </div>
      `;

      // Send emails concurrently to all admins
      await Promise.all(
        admins.map(admin => 
          sendEmail(admin.email, `New Ticket Alert: #${ticketId} - ${title}`, adminEmailHtml)
        )
      );
    }
  } catch (error) {
    console.error("Failed to send new ticket notifications:", error);
  }
  // ----------------------------------

  return NextResponse.json({ id: ticketId }, { status: 201 });
}