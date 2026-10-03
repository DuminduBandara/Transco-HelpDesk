import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildTicketReopenedEmail } from "@/lib/emailTemplates";

// POST /api/tickets/:id/reopen — Reopen a resolved or closed ticket
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticketId = params.id.trim();
  if (!ticketId || ticketId.length > 20) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const rows = await query<any>(
    `SELECT
       t.id, t.title, t.description, t.status, t.priority,
       t.category_id, c.name AS category_name,
       t.created_by, cu.name AS created_by_name, cu.email AS created_by_email,
       t.assigned_to, au.name AS assigned_to_name, au.email AS assigned_to_email
     FROM tickets t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN users cu ON cu.id = t.created_by
     LEFT JOIN users au ON au.id = t.assigned_to
     WHERE t.id = ?
     LIMIT 1`,
    [ticketId]
  );

  const ticket = rows[0];
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Reopen option is strictly for the staff member who submitted the ticket, not for admin
  if (user.role === "admin") {
    return NextResponse.json(
      { error: "Forbidden: Admins manage ticket status directly via the management panel." },
      { status: 403 }
    );
  }

  // Authorization: Only the staff member who created the ticket can reopen it
  const isCreator =
    String(ticket.created_by) === String(user.id) ||
    Boolean(
      ticket.created_by_email &&
        ticket.created_by_email.toLowerCase() === user.email.toLowerCase()
    );

  if (!isCreator) {
    return NextResponse.json(
      { error: "Forbidden: Only the staff member who submitted this ticket can reopen it." },
      { status: 403 }
    );
  }


  // State check: Only resolved or closed tickets can be reopened
  if (ticket.status !== "resolved" && ticket.status !== "closed") {
    return NextResponse.json(
      { error: "Only resolved or closed tickets can be reopened." },
      { status: 400 }
    );
  }

  // Reset ticket status to 'open' and clear resolution timestamp
  await execute(
    `UPDATE tickets
     SET status = 'open', resolved_at = NULL, updated_at = NOW()
     WHERE id = ?`,
    [ticketId]
  );

  // Send background email notifications in the same ticket thread
  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

  // 1. Notify the ticket creator
  if (ticket.created_by_email) {
    const creatorEmailData = buildTicketReopenedEmail({
      ticketId,
      title: ticket.title,
      reopenerName: user.name,
      reopenerEmail: user.email,
      isStaffRecipient: false,
      recipientName: ticket.created_by_name || "Colleague",
      appUrl,
    });

    sendEmail(ticket.created_by_email, creatorEmailData.subject, creatorEmailData.html, {
      text: creatorEmailData.text,
      ticketId,
      isReply: true,
    }).catch((err) => {
      console.error(`[Email Error] Failed to send reopen email to creator for ticket ${ticketId}:`, err);
    });
  }

  // 2. Notify IT staff / admins (and assigned technician if different)
  (async () => {
    try {
      const staffRows = await query<any>(
        `SELECT DISTINCT email, name FROM users 
         WHERE (role = 'admin' OR id = ?) AND is_active = 1`,
        [ticket.assigned_to || 0]
      );

      for (const staff of staffRows) {
        // Skip sending if the staff member is the one who reopened it or is the ticket creator (already notified above)
        if (
          staff.email &&
          staff.email.toLowerCase() !== user.email.toLowerCase() &&
          staff.email.toLowerCase() !== (ticket.created_by_email || "").toLowerCase()
        ) {
          const staffEmailData = buildTicketReopenedEmail({
            ticketId,
            title: ticket.title,
            reopenerName: user.name,
            reopenerEmail: user.email,
            isStaffRecipient: true,
            recipientName: staff.name || "IT Support",
            appUrl,
          });

          await sendEmail(staff.email, staffEmailData.subject, staffEmailData.html, {
            text: staffEmailData.text,
            ticketId,
            isReply: true,
          }).catch((err) => {
            console.error(`[Email Error] Failed to send reopen email to staff ${staff.email}:`, err);
          });
        }
      }
    } catch (err) {
      console.error(`[Email Error] Failed to query staff for reopen notification on ticket ${ticketId}:`, err);
    }
  })();

  return NextResponse.json({
    success: true,
    message: "Ticket has been reopened successfully.",
  });
}
