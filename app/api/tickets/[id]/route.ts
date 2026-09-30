import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { updateTicketSchema } from "@/lib/validators";
import { sendEmail } from '@/lib/email';
import type { Ticket } from "@/types";

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

  // --- EMAIL NOTIFICATION TRIGGER ---
  try {
    // Check if the status was explicitly changed in this request
    if (data.status && data.status !== existing.status && updated) {
      
      // Determine header color based on the new status
      const statusColors: Record<string, string> = {
        open: '#0056b3',
        'in progress': '#ffc107',
        resolved: '#28a745',
        closed: '#6c757d'
      };
      const statusColor = statusColors[data.status.toLowerCase()] || '#0056b3';
      
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: ${statusColor};">Ticket Status Update: #${id}</h2>
          <p>The status of the ticket "<strong>${updated.title}</strong>" has been changed to: <strong style="text-transform: uppercase; color: ${statusColor};">${data.status}</strong>.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Updated by:</strong> ${user.name}</p>
          </div>
          <p>Please log in to the Transco HelpDesk to view full details or add comments.</p>
        </div>
      `;

      // 1. Notify the user who originally created the ticket
      const creatorEmail = (updated as any).created_by_email;
      if (creatorEmail) {
        await sendEmail(creatorEmail, `Ticket Update: #${id} [${data.status.toUpperCase()}]`, emailHtml);
      }

      // 2. Notify the assigned staff member (if it exists, and it isn't the person making the change or the creator)
      const assigneeEmail = (updated as any).assigned_to_email;
      if (assigneeEmail && assigneeEmail !== creatorEmail && assigneeEmail !== user.email) {
        await sendEmail(assigneeEmail, `Assigned Ticket Update: #${id} [${data.status.toUpperCase()}]`, emailHtml);
      }
    }
  } catch (error) {
    console.error(`Failed to send status update notification for ticket ${id}:`, error);
  }
  // ----------------------------------

  return NextResponse.json({ ticket: updated });
}

// DELETE /api/tickets/:id — admin only (hard delete, rarely used; prefer 'closed' status)
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