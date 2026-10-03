// lib/email.ts
import nodemailer from "nodemailer";

/**
 * Gmail SMTP Transporter
 * Configured exclusively for Gmail using Google App Passwords
 */
function getTransporter() {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ticketId?: string;
  isReply?: boolean;
}

/**
 * Sends an email using Gmail SMTP with high deliverability to avoid Junk/Spam folders.
 * Uses genuine DKIM-signed Message-IDs and multipart/alternative (HTML + Plain-Text).
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: {
    text?: string;
    ticketId?: string;
    isReply?: boolean;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();

  if (!user || !pass) {
    console.warn(
      "[Email] Gmail credentials not configured (SMTP_USER, SMTP_PASS in .env.local). Email skipped."
    );
    return { success: false, error: "Gmail SMTP credentials not configured" };
  }

  // Parse a clean sender name and email to prevent SPF / DKIM header mismatch
  const rawFrom = (process.env.EMAIL_FROM || "").trim();
  let displayName = "Transco IT HelpDesk";
  if (rawFrom.includes("<")) {
    displayName = rawFrom.replace(/<.*/, "").replace(/["']/g, "").trim() || displayName;
  }

  // Fallback plain text if not provided
  const textContent =
    options?.text ||
    html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  try {
    const transporter = getTransporter();

    const finalSubject = subject.trim();

    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: displayName,
        address: user,
      },
      to: to.trim(),
      subject: finalSubject,
      text: textContent,
      html,
    };



    const info = await transporter.sendMail(mailOptions);
    console.log(
      `[Email - Gmail] Successfully delivered to ${to} (Subject: "${finalSubject}") [Message ID: ${info.messageId}]`
    );
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[Email - Gmail] Failed to send email to ${to}:`, error?.message || error);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}