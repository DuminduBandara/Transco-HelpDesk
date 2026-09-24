import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { createCommentSchema } from "@/lib/validators";
import type { Ticket, TicketComment } from "@/types";

async function canAccessTicket(
  ticketId: number,
  user: { id: number; role: string }
) {
  const rows = await query<Ticket>(
    "SELECT id, created_by FROM tickets WHERE id = ? LIMIT 1",
    [ticketId]
  );
  const ticket = rows[0];
  if (!ticket) return { ok: false, status: 404 as const };
  if (user.role === "employee" && ticket.created_by !== user.id) {
    return { ok: false, status: 403 as const };
  }
  return { ok: true as const };
}

// GET /api/tickets/:id/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticketId = Number(params.id);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const access = await canAccessTicket(ticketId, user);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 404 ? "Ticket not found" : "Forbidden" },
      { status: access.status }
    );
  }

  const comments = await query<TicketComment>(
    `SELECT tc.id, tc.ticket_id, tc.user_id, u.name AS user_name, u.role AS user_role,
            tc.comment, tc.created_at
     FROM ticket_comments tc
     JOIN users u ON u.id = tc.user_id
     WHERE tc.ticket_id = ?
     ORDER BY tc.created_at ASC`,
    [ticketId]
  );

  return NextResponse.json({ comments });
}

// POST /api/tickets/:id/comments
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticketId = Number(params.id);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const access = await canAccessTicket(ticketId, user);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 404 ? "Ticket not found" : "Forbidden" },
      { status: access.status }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await execute(
    "INSERT INTO ticket_comments (ticket_id, user_id, comment) VALUES (?, ?, ?)",
    [ticketId, user.id, parsed.data.comment]
  );

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
