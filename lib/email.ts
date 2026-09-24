import nodemailer from "nodemailer";
import { execute, query } from "@/lib/db";
import type { NotificationType } from "@/types";

interface SendEmailOptions {
  ticketId?: number | null;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  type: NotificationType;
  html: string;
  text: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST.trim().length > 0);
}

export function getAppBaseUrl(): string {
  const url =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

function createTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

function priorityColor(priority: string): { bg: string; text: string } {
  switch (priority.toLowerCase()) {
    case "urgent":
      return { bg: "#fee2e2", text: "#b91c1c" };
    case "high":
      return { bg: "#ffedd5", text: "#c2410c" };
    case "medium":
      return { bg: "#fef3c7", text: "#b45309" };
    default:
      return { bg: "#e0f2fe", text: "#0369a1" };
  }
}

function renderEmailTemplate({
  headline,
  statusBadge,
  bodyHtml,
  ctaText,
  ctaUrl,
}: {
  headline: string;
  statusBadge?: { label: string; bg: string; color: string };
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6f8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header -->
          <tr>
            <td style="background-color: #1976d2; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">IT Help Desk</span>
                    <span style="display: block; font-size: 13px; color: #e3f2fd; margin-top: 4px;">Automated Ticket Notification System</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              ${
                statusBadge
                  ? `<div style="margin-bottom: 16px;">
                      <span style="display: inline-block; padding: 6px 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 9999px; background-color: ${statusBadge.bg}; color: ${statusBadge.color};">
                        ${statusBadge.label}
                      </span>
                    </div>`
                  : ""
              }
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${headline}
              </h1>

              <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                ${bodyHtml}
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 32px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #1976d2;">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin-top: 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
                Can't click the button? Copy and paste this link in your browser:<br>
                <a href="${ctaUrl}" style="color: #1976d2; word-break: break-all;">${ctaUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
              This notification was generated automatically by the IT Help Desk application.<br>
              &copy; ${new Date().getFullYear()} IT Help Desk Support Portal.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatches an email (or simulates if SMTP is unconfigured) and logs it.
 */
export async function sendEmail({
  ticketId,
  recipientEmail,
  recipientName,
  subject,
  type,
  html,
  text,
}: SendEmailOptions): Promise<{ success: boolean; status: "delivered" | "simulated" | "failed"; error?: string }> {
  const from = process.env.SMTP_FROM || '"IT Help Desk" <helpdesk@company.com>';
  const transporter = createTransporter();

  let status: "delivered" | "simulated" | "failed" = "delivered";
  let errorMessage: string | null = null;

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: `"${recipientName}" <${recipientEmail}>`,
        subject,
        text,
        html,
      });
      console.log(`[Email Delivered] To: ${recipientEmail} | Subject: ${subject}`);
      status = "delivered";
    } catch (err) {
      console.error(`[Email Failed] To: ${recipientEmail} | Error:`, err);
      status = "failed";
      errorMessage = (err as Error).message || "SMTP error";
    }
  } else {
    // Simulation / Dev mode when SMTP is not configured
    console.log(
      `[Email Notification (Simulation Mode)]\n` +
        `  To: ${recipientName} <${recipientEmail}>\n` +
        `  Subject: ${subject}\n` +
        `  Type: ${type}\n` +
        `  Ticket ID: ${ticketId ?? "N/A"}\n`
    );
    status = "simulated";
  }

  // Record to email_notifications store (mockDb or MySQL)
  try {
    await execute(
      `INSERT INTO email_notifications
        (ticket_id, recipient_email, recipient_name, subject, type, status, body_text, body_html, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketId ?? null,
        recipientEmail,
        recipientName,
        subject,
        type,
        status,
        text,
        html,
        errorMessage,
      ]
    );
  } catch (err) {
    console.warn("[Email Notification] Could not record notification to DB:", (err as Error).message);
  }

  return {
    success: status !== "failed",
    status,
    error: errorMessage || undefined,
  };
}

/**
 * Trigger 1: When an employee submits a new ticket.
 * - Notifies all IT Admins of the new ticket so they can triage and assign it.
 * - Sends a confirmation email to the employee who submitted the ticket.
 */
export async function sendTicketCreatedNotification(ticket: {
  id: number;
  title: string;
  description: string;
  priority: string;
  categoryName?: string | null;
  creatorName: string;
  creatorEmail: string;
  creatorDepartment?: string | null;
  createdAt?: string;
}) {
  const baseUrl = getAppBaseUrl();
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;
  const priBadge = priorityColor(ticket.priority);

  // 1. Notify IT Admins
  try {
    const adminRows = await query<{ id: number; name: string; email: string }>(
      "SELECT id, name, email FROM users WHERE role = 'admin' AND is_active = 1"
    );

    const adminEmails = new Map<string, string>();
    for (const admin of adminRows) {
      if (admin.email) adminEmails.set(admin.email.toLowerCase(), admin.name);
    }

    // Optional environment fallback email for IT admin team
    const envAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (envAdminEmail && !adminEmails.has(envAdminEmail.toLowerCase())) {
      adminEmails.set(envAdminEmail.toLowerCase(), "IT Admin Team");
    }

    const adminSubject = `[IT Help Desk] New Ticket #${ticket.id}: ${ticket.title}`;
    const adminBodyHtml = `
      <p style="margin-top: 0;">A new IT support ticket has been submitted and requires triage.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size: 14px;">
          <tr>
            <td style="width: 140px; color: #64748b; font-weight: 600;">Ticket ID:</td>
            <td style="font-weight: 600; color: #0f172a;">#${ticket.id}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Title:</td>
            <td style="font-weight: 600; color: #0f172a;">${escapeHtml(ticket.title)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Priority:</td>
            <td>
              <span style="display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background-color: ${priBadge.bg}; color: ${priBadge.text}; text-transform: uppercase;">
                ${ticket.priority}
              </span>
            </td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Category:</td>
            <td style="color: #334155;">${escapeHtml(ticket.categoryName || "Uncategorized")}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Reported By:</td>
            <td style="color: #334155;"><strong>${escapeHtml(ticket.creatorName)}</strong> (${escapeHtml(ticket.creatorEmail)})</td>
          </tr>
          ${
            ticket.creatorDepartment
              ? `<tr>
                  <td style="color: #64748b; font-weight: 600;">Department:</td>
                  <td style="color: #334155;">${escapeHtml(ticket.creatorDepartment)}</td>
                </tr>`
              : ""
          }
        </table>
      </div>

      <div style="margin-top: 16px;">
        <strong style="color: #0f172a; font-size: 14px;">Description:</strong>
        <p style="background-color: #ffffff; border-left: 3px solid #1976d2; padding: 12px 16px; margin: 8px 0 0 0; color: #334155; font-size: 14px; white-space: pre-wrap;">${escapeHtml(ticket.description)}</p>
      </div>
    `;

    const adminBodyText = `New Ticket #${ticket.id}: ${ticket.title}
Reported By: ${ticket.creatorName} (${ticket.creatorEmail})
Priority: ${ticket.priority}
Category: ${ticket.categoryName || "Uncategorized"}
Department: ${ticket.creatorDepartment || "N/A"}

Description:
${ticket.description}

View Ticket: ${ticketUrl}`;

    for (const [adminEmail, adminName] of adminEmails.entries()) {
      await sendEmail({
        ticketId: ticket.id,
        recipientEmail: adminEmail,
        recipientName: adminName,
        subject: adminSubject,
        type: "ticket_created_admin",
        html: renderEmailTemplate({
          headline: `New Support Ticket #${ticket.id}`,
          statusBadge: {
            label: `Priority: ${ticket.priority}`,
            bg: priBadge.bg,
            color: priBadge.text,
          },
          bodyHtml: adminBodyHtml,
          ctaText: "Review Ticket in Help Desk",
          ctaUrl: ticketUrl,
        }),
        text: adminBodyText,
      });
    }
  } catch (err) {
    console.error("[Email Notification] Failed to notify admins of new ticket:", err);
  }

  // 2. Send Confirmation to Employee
  try {
    const employeeSubject = `[IT Help Desk] Ticket #${ticket.id} Received: ${ticket.title}`;
    const employeeBodyHtml = `
      <p style="margin-top: 0;">Hi <strong>${escapeHtml(ticket.creatorName)}</strong>,</p>
      <p>Thank you for submitting your IT support request. We have received your ticket and added it to our queue. An IT administrator or agent will review it shortly.</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size: 14px;">
          <tr>
            <td style="width: 130px; color: #64748b; font-weight: 600;">Ticket Reference:</td>
            <td style="font-weight: 600; color: #0f172a;">#${ticket.id}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Title:</td>
            <td style="color: #0f172a;">${escapeHtml(ticket.title)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Priority:</td>
            <td>
              <span style="display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background-color: ${priBadge.bg}; color: ${priBadge.text}; text-transform: uppercase;">
                ${ticket.priority}
              </span>
            </td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Category:</td>
            <td style="color: #334155;">${escapeHtml(ticket.categoryName || "Uncategorized")}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Initial Status:</td>
            <td style="color: #0284c7; font-weight: 600;">Open</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #475569;">
        You can track the progress of your issue or provide additional updates and attachments by clicking the link below.
      </p>
    `;

    const employeeBodyText = `Hi ${ticket.creatorName},

Your support request #${ticket.id} (${ticket.title}) has been received by IT Help Desk.
Priority: ${ticket.priority}
Category: ${ticket.categoryName || "Uncategorized"}
Status: Open

You can track your ticket progress here:
${ticketUrl}

Thank you,
IT Help Desk Team`;

    await sendEmail({
      ticketId: ticket.id,
      recipientEmail: ticket.creatorEmail,
      recipientName: ticket.creatorName,
      subject: employeeSubject,
      type: "ticket_created_employee",
      html: renderEmailTemplate({
        headline: `Ticket #${ticket.id} Received`,
        statusBadge: {
          label: "Ticket Created",
          bg: "#e0f2fe",
          color: "#0369a1",
        },
        bodyHtml: employeeBodyHtml,
        ctaText: "Track Your Ticket",
        ctaUrl: ticketUrl,
      }),
      text: employeeBodyText,
    });
  } catch (err) {
    console.error("[Email Notification] Failed to send ticket confirmation to employee:", err);
  }
}

/**
 * Trigger 2: When an IT Admin or Agent fixes/resolves the issue.
 * - Sends an email notification to the employee letting them know the issue is fixed.
 */
export async function sendTicketResolvedNotification(ticket: {
  id: number;
  title: string;
  description: string;
  priority: string;
  categoryName?: string | null;
  creatorName: string;
  creatorEmail: string;
  resolvedByName: string;
  resolvedByEmail?: string;
  status: "resolved" | "closed";
  resolvedAt?: string;
}) {
  const baseUrl = getAppBaseUrl();
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;
  const isClosed = ticket.status === "closed";
  const actionLabel = isClosed ? "Closed" : "Resolved";

  try {
    const subject = `[IT Help Desk] Issue ${actionLabel}: Ticket #${ticket.id} - ${ticket.title}`;
    const resolvedTime = ticket.resolvedAt || new Date().toLocaleString();

    const bodyHtml = `
      <p style="margin-top: 0;">Hi <strong>${escapeHtml(ticket.creatorName)}</strong>,</p>
      <p>Great news! Your IT support ticket has been marked as <strong>${actionLabel.toLowerCase()}</strong> by IT Support.</p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 18px; margin: 20px 0;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 16px; font-weight: 700; color: #15803d;">
            &#10003; Issue Marked as ${actionLabel}
          </span>
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size: 14px;">
          <tr>
            <td style="width: 140px; color: #166534; font-weight: 600;">Ticket ID:</td>
            <td style="font-weight: 600; color: #0f172a;">#${ticket.id}</td>
          </tr>
          <tr>
            <td style="color: #166534; font-weight: 600;">Title:</td>
            <td style="font-weight: 600; color: #0f172a;">${escapeHtml(ticket.title)}</td>
          </tr>
          <tr>
            <td style="color: #166534; font-weight: 600;">Resolved By:</td>
            <td style="color: #0f172a;">
              <strong>${escapeHtml(ticket.resolvedByName)}</strong>
              ${ticket.resolvedByEmail ? `(${escapeHtml(ticket.resolvedByEmail)})` : ""}
            </td>
          </tr>
          <tr>
            <td style="color: #166534; font-weight: 600;">Resolved Time:</td>
            <td style="color: #334155;">${escapeHtml(resolvedTime)}</td>
          </tr>
          <tr>
            <td style="color: #166534; font-weight: 600;">Category:</td>
            <td style="color: #334155;">${escapeHtml(ticket.categoryName || "General")}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 16px; font-size: 14px; color: #475569; line-height: 1.6;">
        <p>
          Please verify that the resolution works as expected in your environment.
        </p>
        <p style="margin-bottom: 0;">
          If you continue to experience problems or need further help with this issue, you can view the ticket and post a follow-up comment directly.
        </p>
      </div>
    `;

    const bodyText = `Hi ${ticket.creatorName},

Your IT support ticket #${ticket.id} (${ticket.title}) has been marked as ${actionLabel.toLowerCase()} by ${ticket.resolvedByName}.

Resolution Time: ${resolvedTime}
Category: ${ticket.categoryName || "General"}

Please check and verify that everything is working properly. If you still need help, you can review or reply to the ticket here:
${ticketUrl}

Best regards,
IT Help Desk Support Team`;

    await sendEmail({
      ticketId: ticket.id,
      recipientEmail: ticket.creatorEmail,
      recipientName: ticket.creatorName,
      subject,
      type: "ticket_resolved",
      html: renderEmailTemplate({
        headline: `Issue ${actionLabel}: Ticket #${ticket.id}`,
        statusBadge: {
          label: `Status: ${actionLabel}`,
          bg: "#dcfce7",
          color: "#15803d",
        },
        bodyHtml,
        ctaText: "Review Resolved Ticket",
        ctaUrl: ticketUrl,
      }),
      text: bodyText,
    });
  } catch (err) {
    console.error("[Email Notification] Failed to send ticket resolved notification:", err);
  }
}

/**
 * Trigger: When a user requests a password reset.
 * - Sends a temporary password reset link valid for 60 minutes.
 * - Logs the notification into email_notifications for auditing.
 */
export async function sendPasswordResetEmail({
  recipientEmail,
  recipientName,
  token,
  expiresMinutes = 60,
}: {
  recipientEmail: string;
  recipientName: string;
  token: string;
  expiresMinutes?: number;
}): Promise<{ success: boolean; status: "delivered" | "simulated" | "failed"; resetUrl: string; error?: string }> {
  const baseUrl = getAppBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "[IT Help Desk] Password Reset Request";

  const bodyHtml = `
    <p style="margin-top: 0;">Hi <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p>We received a request to reset the password for your IT Help Desk account (<strong>${escapeHtml(recipientEmail)}</strong>).</p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
        Temporary Reset Authorization
      </p>
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        Click the button below to choose a new password. This single-use link is valid for <strong>${expiresMinutes} minutes</strong> from when it was requested.
      </p>
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
      If you did not request this change, please safely disregard this email. Your password will remain unchanged and your account is secure.
    </p>

    <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
      If the button above does not work, copy and paste this URL into your browser:<br/>
      <a href="${resetUrl}" style="color: #1976d2; word-break: break-all;">${resetUrl}</a>
    </p>
  `;

  const bodyText = `Hi ${recipientName},

We received a request to reset the password for your IT Help Desk account (${recipientEmail}).

Please use the following temporary link to set a new password (valid for ${expiresMinutes} minutes):
${resetUrl}

If you did not request this password reset, you can safely ignore this email. Your account remains secure.

Best regards,
IT Help Desk Security Team`;

  const emailRes = await sendEmail({
    ticketId: null,
    recipientEmail,
    recipientName,
    subject,
    type: "password_reset",
    html: renderEmailTemplate({
      headline: "Reset Your Account Password",
      statusBadge: {
        label: "Security Alert",
        bg: "#fef3c7",
        color: "#b45309",
      },
      bodyHtml,
      ctaText: "Reset My Password",
      ctaUrl: resetUrl,
    }),
    text: bodyText,
  });

  return {
    ...emailRes,
    resetUrl,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
