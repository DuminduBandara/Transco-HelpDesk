import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { updateTicketSchema } from "@/lib/validators";
import { sendTicketResolvedNotification } from "@/lib/email";
import type { Ticket } from "@/types";

async function getTicketOr404(id: number) {
  const rows = await query<Ticket & { created_by_email?: string }>(
    `SELECT
       t.id, t.title, t.description, t.internal_notes, t.status, t.priority,
       t.category_id, c.name AS category_name,
       t.created_by, cu.name AS created_by_name, cu.email AS created_by_email,
       t.assigned_to, au.name AS assigned_to_name,
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

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const ticket = await getTicketOr404(id);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Employees may only view their own tickets.
  if (user.role === "employee" && ticket.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Internal Notes: only visible to agents and admins; strip for employees
  if (user.role === "employee") {
    delete (ticket as unknown as Record<string, unknown>).internal_notes;
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

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
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

  // Trigger email notification when IT Admin / Agent resolves or closes the issue
  const isResolving =
    (data.status === "resolved" || data.status === "closed") &&
    existing.status !== data.status;

  if (isResolving && updated) {
    const recipientEmail =
      updated.created_by_email ||
      (await query<{ email: string }>("SELECT email FROM users WHERE id = ?", [
        updated.created_by,
      ]))[0]?.email;

    if (recipientEmail) {
      sendTicketResolvedNotification({
        id: updated.id,
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        categoryName: updated.category_name,
        creatorName: updated.created_by_name || "Employee",
        creatorEmail: recipientEmail,
        resolvedByName: user.name,
        resolvedByEmail: user.email,
        status: data.status as "resolved" | "closed",
        resolvedAt: updated.resolved_at || new Date().toLocaleString(),
      }).catch((err) => {
        console.error("[Email] Error dispatching ticket resolved notification:", err);
      });
    }
  }

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

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const result = await execute("DELETE FROM tickets WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
