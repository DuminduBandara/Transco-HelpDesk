import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { isSmtpConfigured, sendEmail, getAppBaseUrl } from "@/lib/email";
import type { EmailNotification } from "@/types";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticket_id");

  let sql =
    "SELECT id, ticket_id, recipient_email, recipient_name, subject, type, status, body_text, body_html, error_message, created_at FROM email_notifications";
  const params: unknown[] = [];
  const where: string[] = [];

  // Scoping: employees only see notifications sent to their email
  if (user.role === "employee") {
    where.push("recipient_email = ?");
    params.push(user.email);
  }

  if (ticketId) {
    where.push("ticket_id = ?");
    params.push(Number(ticketId));
  }

  if (where.length > 0) {
    sql += ` WHERE ${where.join(" AND ")}`;
  }

  sql += " ORDER BY created_at DESC LIMIT 50";

  const rows = await query<EmailNotification>(sql, params);

  return NextResponse.json({
    notifications: rows,
    smtpConfigured: isSmtpConfigured(),
    smtpHost: process.env.SMTP_HOST || null,
    smtpUser: process.env.SMTP_USER || null,
  });
}

// POST /api/notifications — send test email (admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const targetEmail = (body.email || user.email).trim();

  const baseUrl = getAppBaseUrl();
  const testSubject = `[IT Help Desk] Test Email Notification from ${user.name}`;
  const testHtml = `
    <p>This is a test email sent from the IT Help Desk notification service.</p>
    <p>SMTP configuration status: <strong>${isSmtpConfigured() ? "Configured & Active" : "Simulation / Dev Mode"}</strong>.</p>
    <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 13px; margin: 16px 0;">
      Timestamp: ${new Date().toISOString()}<br>
      Requested By: ${user.name} (${user.email})<br>
      Host: ${process.env.SMTP_HOST || "none (in-memory simulation)"}
    </div>
  `;
  const testText = `IT Help Desk Test Email\nSent at: ${new Date().toISOString()}\nRequested By: ${user.name} (${user.email})`;

  const result = await sendEmail({
    recipientEmail: targetEmail,
    recipientName: user.name,
    subject: testSubject,
    type: "test",
    html: testHtml,
    text: testText,
  });

  return NextResponse.json({
    success: result.success,
    status: result.status,
    recipient: targetEmail,
    error: result.error,
    smtpConfigured: isSmtpConfigured(),
  });
}
