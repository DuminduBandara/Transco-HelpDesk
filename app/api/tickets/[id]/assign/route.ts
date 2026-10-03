import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildTicketStatusUpdateEmail } from "@/lib/emailTemplates";
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

  const ticketId = params.id.trim();
  if (!ticketId || ticketId.length > 20) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const rows = await query<any>(
    `SELECT
       t.id, t.title, t.description, t.status, t.priority,
       t.category_id, c.name AS category_name,
       t.created_by, cu.name AS created_by_name, cu.email AS created_by_email
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users cu ON cu.id = t.created_by
     WHERE t.id = ?
     LIMIT 1`,
    [ticketId]
  );

  const ticket = rows[0];
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const oldStatus = ticket.status;
  const newStatus = oldStatus === "open" ? "in_progress" : oldStatus;

  await execute(
    `UPDATE tickets
     SET assigned_to = ?, status = IF(status = 'open', 'in_progress', status)
     WHERE id = ?`,
    [user.id, ticketId]
  );

  // Send status update notification to the creator in the existing email chain
  if (ticket.created_by_email) {
    const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
    const emailData = buildTicketStatusUpdateEmail({
      ticketId,
      title: ticket.title,
      newStatus: newStatus,
      oldStatus: oldStatus,
      updaterName: user.name,
      recipientName: ticket.created_by_name || "Colleague",
      assigneeName: user.name,
      categoryName: ticket.category_name,
      priority: ticket.priority,
      appUrl,
    });

    sendEmail(ticket.created_by_email, emailData.subject, emailData.html, {
      text: emailData.text,
      ticketId,
      isReply: true,
    }).catch((err) => {
      console.error(`[Email Error] Failed to send assign notification for ticket ${ticketId}:`, err);
    });
  }

  return NextResponse.json({ success: true });
}

