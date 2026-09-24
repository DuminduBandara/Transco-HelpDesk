import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { broadcastRealtimeEvent } from "@/lib/realtime";
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

  const rows = await query<Ticket>("SELECT id FROM tickets WHERE id = ?", [
    ticketId,
  ]);
  if (!rows[0]) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  await execute(
    `UPDATE tickets
     SET assigned_to = ?, status = IF(status = 'open', 'in_progress', status)
     WHERE id = ?`,
    [user.id, ticketId]
  );

  broadcastRealtimeEvent("ticket:updated", {
    id: ticketId,
    assigned_to: user.id,
    assigned_to_name: user.name,
  });
  broadcastRealtimeEvent("stats:updated");

  return NextResponse.json({ success: true });
}
