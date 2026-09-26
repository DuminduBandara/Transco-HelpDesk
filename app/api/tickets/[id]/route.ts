import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { updateTicketSchema } from "@/lib/validators";
import type { Ticket } from "@/types";

async function getTicketOr404(id: string) {
  const rows = await query<Ticket>(
    `SELECT
       t.id, t.title, t.description, t.status, t.priority,
       t.category_id, c.name AS category_name,
       t.created_by, cu.name AS created_by_name,
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

  const id = params.id.trim();
  if (!id || id.length > 20) {
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
