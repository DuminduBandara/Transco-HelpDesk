import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { notifyOnTicketStatusChange } from "@/lib/notifications";
import type { Ticket } from "@/types";

// POST /api/tickets/:id/assign — agent claims a ticket for themself.
// (Admins re-assigning to someone else should use PATCH /api/tickets/:id instead.)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(user, ["agent", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticketId = Number(params.id);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const rows = await query<Ticket>(
    "SELECT id, title, created_by, status FROM tickets WHERE id = ? LIMIT 1",
    [ticketId]
  );
  const ticket = rows[0];
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const oldStatus = ticket.status;

  await execute(
    `UPDATE tickets
     SET assigned_to = ?, status = IF(status = 'open', 'in_progress', status)
     WHERE id = ?`,
    [user.id, ticketId]
  );

  if (oldStatus === "open") {
    await notifyOnTicketStatusChange({
      ticket: { id: ticket.id, title: ticket.title, created_by: ticket.created_by },
      oldStatus: "open",
      newStatus: "in_progress",
      actor: {
        id: user.id,
        name: user.name ?? "Support Agent",
        role: user.role,
        email: user.email,
      },
    }).catch((err) => {
      console.error("[Notification] Failed to notify on claim:", err);
    });
  }

  return NextResponse.json({ success: true });
}

