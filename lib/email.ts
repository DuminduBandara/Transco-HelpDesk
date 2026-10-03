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

/**
 * Sends an email using Gmail SMTP.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();
  const from = process.env.EMAIL_FROM || user;

  if (!user || !pass) {
    console.warn(
      "[Email] Gmail credentials not configured (SMTP_USER, SMTP_PASS in .env.local). Email skipped."
    );
    return { success: false, error: "Gmail SMTP credentials not configured" };
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from,
      to: to.trim(),
      subject,
      html,
    });

    console.log(`[Email - Gmail] Email successfully sent to ${to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[Email - Gmail] Failed to send email to ${to}:`, error?.message || error);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}