import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { updateTicketSchema } from "@/lib/validators";
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

async function getTicketOr404(id: string) {
  const rows = await query<Ticket>(
    `SELECT
       t.id, t.title, t.description, t.status, t.priority,
       t.category_id, c.name AS category_name,
       t.created_by, cu.name AS created_by_name, cu.email AS created_by_email, cu.role AS created_by_role, cu.mobile_number AS created_by_mobile,
       t.assigned_to, au.name AS assigned_to_name, au.email AS assigned_to_email, au.role AS assigned_to_role, au.mobile_number AS assigned_to_mobile,
       t.created_at, t.updated_at, t.resolved_at
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users cu ON cu.id = t.created_by
     LEFT JOIN users au ON au.id = t.assigned_to
     WHERE t.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

import { buildTicketStatusUpdateEmail } from "@/lib/emailTemplates";

// Background asynchronous email dispatch for status update (chained into the ticket's email thread)
async function sendTicketStatusUpdateEmail(params: {
  ticketId: string;
  ticketTitle: string;
  newStatus: string;
  oldStatus?: string;
  updaterName: string;
  creatorName: string;
  creatorEmail?: string;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  categoryName?: string | null;
  priority?: string;
  updaterEmail: string;
}) {
  const {
    ticketId,
    ticketTitle,
    newStatus,
    oldStatus,
    updaterName,
    creatorName,
    creatorEmail,
    assigneeName,
    assigneeEmail,
    categoryName,
    priority,
    updaterEmail,
  } = params;

  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  const subject = `[Ticket #${ticketId}] ${ticketTitle}`;

  // 1. Notify the staff member who originally submitted the ticket (chained in single thread)
  if (creatorEmail) {
    const creatorEmailData = buildTicketStatusUpdateEmail({
      ticketId,
      title: ticketTitle,
      newStatus,
      oldStatus,
      updaterName,
      recipientName: creatorName,
      assigneeName,
      categoryName,
      priority,
      appUrl,
    });

    await sendEmail(creatorEmail, creatorEmailData.subject, creatorEmailData.html, {
      text: creatorEmailData.text,
      ticketId,
      isReply: true,
    });
  }

  // 2. Notify assigned technician (if different from creator and updater)
  if (assigneeEmail && assigneeEmail !== creatorEmail && assigneeEmail !== updaterEmail) {
    const assigneeEmailData = buildTicketStatusUpdateEmail({
      ticketId,
      title: ticketTitle,
      newStatus,
      oldStatus,
      updaterName,
      recipientName: assigneeName || "IT Technician",
      assigneeName,
      categoryName,
      priority,
      appUrl,
    });

    await sendEmail(assigneeEmail, assigneeEmailData.subject, assigneeEmailData.html, {
      text: assigneeEmailData.text,
      ticketId,
      isReply: true,
    });
  }
}

// GET /api/tickets/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id.trim();
  if (!id || id.length > 20) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const ticket = await getTicketOr404(id);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Only admins can view any ticket. Non-admin users may only view tickets they created.
  if (user.role !== "admin" && ticket.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden: You may only view tickets you submitted" }, { status: 403 });
  }

  // Strict privacy rule: Do not reveal admin mobile numbers to non-admins
  if (user.role !== "admin") {
    if (ticket.created_by_role === "admin" && ticket.created_by !== user.id) {
      ticket.created_by_mobile = null;
    }
    if (ticket.assigned_to_role === "admin" && ticket.assigned_to !== user.id) {
      ticket.assigned_to_mobile = null;
    }
  }

  return NextResponse.json({ ticket });
}

// PATCH /api/tickets/:id — agents/admins update status, priority, category,
// assignee, title, description. Employees cannot modify tickets after creation.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(user, ["agent", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params.id.trim();
  if (!id || id.length > 20) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const existing = await getTicketOr404(id);
  if (!existing) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // When an admin or agent changes status to 'in_progress', automatically assign to that admin/agent
  if (data.status === "in_progress" && data.assigned_to === undefined) {
    data.assigned_to = user.id;
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  // Auto-stamp resolved_at when status transitions to 'resolved'.
  if (data.status === "resolved") {
    setClauses.push("resolved_at = NOW()");
  } else if (data.status) {
    setClauses.push("resolved_at = NULL");
  }

  values.push(id);

  await execute(
    `UPDATE tickets SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );

  const updated = await getTicketOr404(id);

  // Asynchronous non-blocking email dispatch if status changed or assignee changed
  const statusChanged = Boolean(data.status && data.status !== existing.status);
  const assigneeChanged = Boolean(
    data.assigned_to !== undefined && data.assigned_to !== existing.assigned_to
  );

  if ((statusChanged || assigneeChanged) && updated) {
    sendTicketStatusUpdateEmail({
      ticketId: id,
      ticketTitle: updated.title,
      newStatus: updated.status,
      oldStatus: existing.status,
      updaterName: user.name,
      creatorName: (updated as any).created_by_name || "Colleague",
      creatorEmail: (updated as any).created_by_email,
      assigneeName: (updated as any).assigned_to_name,
      assigneeEmail: (updated as any).assigned_to_email,
      categoryName: (updated as any).category_name,
      priority: updated.priority,
      updaterEmail: user.email,
    }).catch((error) => {
      console.error(`[Email Error] Failed to send status update notification for ticket ${id}:`, error);
    });
  }

  return NextResponse.json({ ticket: updated });
}

// DELETE /api/tickets/:id — admin only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params.id.trim();
  if (!id || id.length > 20) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const result = await execute("DELETE FROM tickets WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}