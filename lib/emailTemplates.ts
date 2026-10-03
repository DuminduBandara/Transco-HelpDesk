// lib/emailTemplates.ts
// Restored to the original, oldest email templates previously used
// Simple, clean, high-deliverability templates that do not trigger Gmail/Outlook spam filters

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 1. Confirmation Email to Staff Member who created the ticket (Original Template)
 */
export function buildTicketCreatedStaffEmail(params: {
  ticketId: string;
  title: string;
  description: string;
  priority: string;
  categoryName?: string;
  userName: string;
  appUrl?: string;
}): { html: string; text: string; subject: string } {
  const safeTicketId = escapeHtml(params.ticketId);
  const safeTitle = escapeHtml(params.title);
  const safeDescription = escapeHtml(params.description);
  const safePriority = escapeHtml(params.priority);
  const safeUserName = escapeHtml(params.userName);
  const safeCategory = params.categoryName ? escapeHtml(params.categoryName) : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #0056b3;">Ticket Submitted Successfully: #${safeTicketId}</h2>
      <p>Hi ${safeUserName},</p>
      <p>We have received your ticket and our team will review it shortly. Here are the details you submitted:</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${safeTitle}</h3>
        <p style="margin-bottom: 0; white-space: pre-wrap;">${safeDescription}</p>
        <br/>
        <p style="margin-bottom: 0;"><strong>Priority:</strong> <span style="text-transform: uppercase;">${safePriority}</span></p>
        ${safeCategory ? `<p style="margin-top: 8px; margin-bottom: 0;"><strong>Category:</strong> ${safeCategory}</p>` : ""}
      </div>
      <p>We will notify you via email when there is an update to your ticket status.</p>
    </div>
  `.trim();

  const text = `
Ticket Submitted Successfully: #${params.ticketId}

Hi ${params.userName},

We have received your ticket and our team will review it shortly. Here are the details you submitted:

Title: ${params.title}
Priority: ${params.priority.toUpperCase()}
${params.categoryName ? `Category: ${params.categoryName}\n` : ""}
Description:
${params.description}

We will notify you via email when there is an update to your ticket status.
  `.trim();

  const subject = `[Ticket #${params.ticketId} - Open] ${params.title}`;

  return { html, text, subject };
}

/**
 * 2. Notification Email to IT Support Admins when a new ticket is submitted (Original Template)
 */
export function buildTicketCreatedAdminEmail(params: {
  ticketId: string;
  title: string;
  description: string;
  priority: string;
  categoryName?: string;
  creatorName: string;
  creatorEmail: string;
  appUrl?: string;
}): { html: string; text: string; subject: string } {
  const safeTicketId = escapeHtml(params.ticketId);
  const safeTitle = escapeHtml(params.title);
  const safeDescription = escapeHtml(params.description);
  const safePriority = escapeHtml(params.priority);
  const safeCreatorName = escapeHtml(params.creatorName);
  const safeCreatorEmail = escapeHtml(params.creatorEmail);
  const safeCategory = params.categoryName ? escapeHtml(params.categoryName) : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #0056b3;">New Ticket Created: #${safeTicketId}</h2>
      <p>A new ticket has been submitted by <strong>${safeCreatorName}</strong> (${safeCreatorEmail}).</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${safeTitle}</h3>
        <p style="margin-bottom: 0; white-space: pre-wrap;">${safeDescription}</p>
        <br/>
        <p style="margin-bottom: 0;"><strong>Priority:</strong> <span style="text-transform: uppercase;">${safePriority}</span></p>
        ${safeCategory ? `<p style="margin-top: 8px; margin-bottom: 0;"><strong>Category:</strong> ${safeCategory}</p>` : ""}
      </div>
      <p>Please log in to the Transco HelpDesk to review and assign this ticket.</p>
    </div>
  `.trim();

  const text = `
New Ticket Created: #${params.ticketId}

A new ticket has been submitted by ${params.creatorName} (${params.creatorEmail}).

Title: ${params.title}
Priority: ${params.priority.toUpperCase()}
${params.categoryName ? `Category: ${params.categoryName}\n` : ""}
Description:
${params.description}

Please log in to the Transco HelpDesk to review and assign this ticket.
  `.trim();

  const subject = `[Ticket #${params.ticketId} - Open] ${params.title}`;

  return { html, text, subject };
}

/**
 * 3. Status Update Email for in_progress, resolved, closed (Original Template)
 */
export function buildTicketStatusUpdateEmail(params: {
  ticketId: string;
  title: string;
  newStatus: string;
  oldStatus?: string;
  updaterName: string;
  recipientName: string;
  assigneeName?: string | null;
  categoryName?: string | null;
  priority?: string;
  appUrl?: string;
}): { html: string; text: string; subject: string } {
  const safeId = escapeHtml(params.ticketId);
  const safeTitle = escapeHtml(params.title);
  const safeStatus = escapeHtml(params.newStatus);
  const safeUpdaterName = escapeHtml(params.updaterName);

  const statusColors: Record<string, string> = {
    open: "#0056b3",
    in_progress: "#ffc107",
    "in progress": "#ffc107",
    resolved: "#28a745",
    closed: "#6c757d",
  };
  const statusColor = statusColors[params.newStatus.toLowerCase()] || "#0056b3";

  let statusLabel = params.newStatus.toUpperCase();
  if (params.newStatus.toLowerCase() === "in_progress" || params.newStatus.toLowerCase() === "in progress") {
    statusLabel = "IN PROGRESS";
  } else if (params.newStatus.toLowerCase() === "resolved") {
    statusLabel = "RESOLVED";
  } else if (params.newStatus.toLowerCase() === "closed") {
    statusLabel = "CLOSED";
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: ${statusColor};">Ticket Status Update: #${safeId}</h2>
      <p>The status of the ticket "<strong>${safeTitle}</strong>" has been changed to: <strong style="text-transform: uppercase; color: ${statusColor};">${statusLabel}</strong>.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Updated by:</strong> ${safeUpdaterName}</p>
        ${params.assigneeName ? `<p style="margin: 8px 0 0 0;"><strong>Assigned to:</strong> ${escapeHtml(params.assigneeName)}</p>` : ""}
      </div>
      <p>Please log in to the Transco HelpDesk to view full details.</p>
    </div>
  `.trim();

  const text = `
Ticket Status Update: #${params.ticketId}

The status of the ticket "${params.title}" has been changed to: ${statusLabel}.

Updated by: ${params.updaterName}
${params.assigneeName ? `Assigned to: ${params.assigneeName}\n` : ""}

Please log in to the Transco HelpDesk to view full details.
  `.trim();

  const subject = `[Ticket #${params.ticketId} - ${statusLabel}] ${params.title}`;

  return { html, text, subject };
}

/**
 * 4. Reopened Ticket Email (Original Template Style)
 */
export function buildTicketReopenedEmail(params: {
  ticketId: string;
  title: string;
  reopenerName: string;
  reopenerEmail: string;
  isStaffRecipient: boolean;
  recipientName: string;
  appUrl?: string;
}): { html: string; text: string; subject: string } {
  const safeId = escapeHtml(params.ticketId);
  const safeTitle = escapeHtml(params.title);
  const safeReopenerName = escapeHtml(params.reopenerName);
  const safeReopenerEmail = escapeHtml(params.reopenerEmail);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #c2410c;">Ticket Reopened: #${safeId}</h2>
      <p>The ticket "<strong>${safeTitle}</strong>" has been reopened by <strong>${safeReopenerName}</strong> (${safeReopenerEmail}).</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;">The user indicated that the issue is still persisting. Our IT Support team will review and attend to it shortly.</p>
      </div>
      <p>Please log in to the Transco HelpDesk to view full details.</p>
    </div>
  `.trim();

  const text = `
Ticket Reopened: #${params.ticketId}

The ticket "${params.title}" has been reopened by ${params.reopenerName} (${params.reopenerEmail}).

The user indicated that the issue is still persisting. Our IT Support team will review and attend to it shortly.

Please log in to the Transco HelpDesk to view full details.
  `.trim();

  const subject = `[Ticket #${params.ticketId} - REOPENED] ${params.title}`;

  return { html, text, subject };
}
