import nodemailer, { type Transporter } from "nodemailer";
import { query, execute } from "@/lib/db";
import type { Ticket, TicketStatus, User } from "@/types";

let transporter: Transporter | null = null;

function getEmailTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function formatStatus(status: TicketStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

async function getTicketCreator(creatorId: number): Promise<{ id: number; name: string; email: string } | null> {
  const rows = await query<{ id: number; name: string; email: string }>(
    "SELECT id, name, email FROM users WHERE id = ? LIMIT 1",
    [creatorId]
  );
  return rows[0] ?? null;
}

interface DispatchEmailArgs {
  ticketId: number;
  ticketTitle: string;
  recipientId: number;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  type: "status_update" | "new_comment";
  subject: string;
  preview: string;
  htmlBody: string;
  textBody: string;
}

async function dispatchEmail(args: DispatchEmailArgs) {
  const fromAddress = process.env.SMTP_FROM || '"IT Helpdesk" <notifications@company.com>';

  // 1. Send via SMTP if configured, else log to console
  const mailer = getEmailTransporter();
  if (mailer) {
    try {
      await mailer.sendMail({
        from: fromAddress,
        to: `"${args.recipientName}" <${args.recipientEmail}>`,
        subject: args.subject,
        text: args.textBody,
        html: args.htmlBody,
      });
      console.log(`[EMAIL NOTIFICATION] Delivered via SMTP to ${args.recipientEmail}: ${args.subject}`);
    } catch (err) {
      console.warn(`[EMAIL NOTIFICATION] SMTP dispatch failed, fallback to simulated delivery:`, (err as Error).message);
    }
  } else {
    console.log(`[EMAIL NOTIFICATION] Simulated email sent to ${args.recipientEmail} (${args.recipientName}):`);
    console.log(`  Subject: ${args.subject}`);
    console.log(`  Preview: ${args.preview}`);
  }

  // 2. Persist notification in database / in-memory store
  try {
    await execute(
      `INSERT INTO notifications
       (ticket_id, ticket_title, recipient_id, recipient_email, recipient_name, sender_name, type, subject, preview, html_body)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        args.ticketId,
        args.ticketTitle,
        args.recipientId,
        args.recipientEmail,
        args.recipientName,
        args.senderName,
        args.type,
        args.subject,
        args.preview,
        args.htmlBody,
      ]
    );
  } catch (err) {
    console.warn("[EMAIL NOTIFICATION] Failed to persist notification record:", (err as Error).message);
  }
}

/**
 * Sends an email notification to the ticket creator when an agent/admin updates ticket status.
 */
export async function notifyOnTicketStatusChange({
  ticket,
  oldStatus,
  newStatus,
  actor,
}: {
  ticket: Pick<Ticket, "id" | "title" | "created_by">;
  oldStatus: TicketStatus;
  newStatus: TicketStatus;
  actor: { id: number; name: string; role: string; email: string };
}) {
  // Do not send if status hasn't changed or if ticket creator is updating their own ticket
  if (oldStatus === newStatus || ticket.created_by === actor.id) {
    return;
  }

  const creator = await getTicketCreator(ticket.created_by);
  if (!creator || !creator.email) return;

  const oldStatusLabel = formatStatus(oldStatus);
  const newStatusLabel = formatStatus(newStatus);
  const subject = `[IT Helpdesk] Ticket #${ticket.id} status updated to ${newStatusLabel}`;
  const preview = `Your ticket "${ticket.title}" has been updated from ${oldStatusLabel} to ${newStatusLabel} by ${actor.name}.`;

  const htmlBody = `
<div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; color: #333333;">
  <div style="background-color: #1976d2; color: #ffffff; padding: 18px 20px; border-radius: 6px; text-align: left;">
    <h2 style="margin: 0; font-size: 20px; font-weight: 600;">IT Helpdesk Notification</h2>
    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Ticket Status Update</p>
  </div>

  <div style="padding: 24px 0;">
    <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${creator.name}</strong>,</p>
    <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px 0; color: #444;">
      Your support request <strong>#${ticket.id}</strong> has been updated by <strong>${actor.name}</strong> (${actor.role}).
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #1976d2; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <div style="font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">
        ${ticket.title}
      </div>
      <div style="font-size: 14px; color: #475569;">
        Status changed:
        <span style="background-color: #e2e8f0; color: #475569; padding: 3px 8px; border-radius: 4px; font-size: 13px; margin: 0 6px;">
          ${oldStatusLabel}
        </span>
        &rarr;
        <span style="background-color: #dbeafe; color: #1d4ed8; padding: 3px 8px; border-radius: 4px; font-size: 13px; font-weight: 600; margin-left: 6px;">
          ${newStatusLabel}
        </span>
      </div>
    </div>

    <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 20px 0;">
      You can review the updated status and activity history anytime in the Help Desk portal.
    </p>

    <div style="text-align: left; margin: 24px 0;">
      <a href="/tickets/${ticket.id}" style="background-color: #1976d2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Ticket #${ticket.id}
      </a>
    </div>
  </div>

  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
  <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
    Automated notification sent by IT Helpdesk. Please do not reply directly to this email.
  </p>
</div>
`;

  const textBody = `Hello ${creator.name},\n\nYour support ticket #${ticket.id} ("${ticket.title}") has been updated by ${actor.name}.\nStatus changed: ${oldStatusLabel} -> ${newStatusLabel}\n\nView details: /tickets/${ticket.id}\n\nIT Helpdesk`;

  await dispatchEmail({
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    recipientId: creator.id,
    recipientEmail: creator.email,
    recipientName: creator.name,
    senderName: actor.name,
    type: "status_update",
    subject,
    preview,
    htmlBody,
    textBody,
  });
}

/**
 * Sends an email notification to the ticket creator when an agent/admin adds a comment.
 */
export async function notifyOnTicketComment({
  ticket,
  comment,
  actor,
}: {
  ticket: Pick<Ticket, "id" | "title" | "created_by">;
  comment: string;
  actor: { id: number; name: string; role: string; email: string };
}) {
  // Do not send if ticket creator is the one commenting
  if (ticket.created_by === actor.id) {
    return;
  }

  const creator = await getTicketCreator(ticket.created_by);
  if (!creator || !creator.email) return;

  const subject = `[IT Helpdesk] New comment on Ticket #${ticket.id}: ${ticket.title}`;
  const snippet = comment.length > 120 ? comment.substring(0, 117) + "..." : comment;
  const preview = `Agent ${actor.name} commented: "${snippet}"`;

  const htmlBody = `
<div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; color: #333333;">
  <div style="background-color: #0288d1; color: #ffffff; padding: 18px 20px; border-radius: 6px; text-align: left;">
    <h2 style="margin: 0; font-size: 20px; font-weight: 600;">IT Helpdesk Notification</h2>
    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">New Agent Response</p>
  </div>

  <div style="padding: 24px 0;">
    <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${creator.name}</strong>,</p>
    <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0; color: #444;">
      Agent <strong>${actor.name}</strong> has posted a response to your ticket <strong>#${ticket.id}</strong>:
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0288d1; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
        ${ticket.title}
      </div>
      <div style="font-size: 15px; line-height: 1.6; color: #334155; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; white-space: pre-wrap;">
${comment}
      </div>
    </div>

    <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 20px 0;">
      You can reply directly to this ticket in the help desk portal.
    </p>

    <div style="text-align: left; margin: 24px 0;">
      <a href="/tickets/${ticket.id}" style="background-color: #0288d1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Reply to Ticket #${ticket.id}
      </a>
    </div>
  </div>

  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
  <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
    Automated notification sent by IT Helpdesk. Please do not reply directly to this email.
  </p>
</div>
`;

  const textBody = `Hello ${creator.name},\n\nAgent ${actor.name} commented on Ticket #${ticket.id} ("${ticket.title}"):\n\n"${comment}"\n\nView and reply: /tickets/${ticket.id}\n\nIT Helpdesk`;

  await dispatchEmail({
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    recipientId: creator.id,
    recipientEmail: creator.email,
    recipientName: creator.name,
    senderName: actor.name,
    type: "new_comment",
    subject,
    preview,
    htmlBody,
    textBody,
  });
}
