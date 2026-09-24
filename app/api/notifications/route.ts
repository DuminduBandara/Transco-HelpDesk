import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { EmailNotification } from "@/types";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const viewAll = searchParams.get("all") === "true" && user.role === "admin";

  let notifications: EmailNotification[] = [];

  if (viewAll) {
    notifications = await query<EmailNotification>(
      `SELECT id, ticket_id, ticket_title, recipient_id, recipient_email, recipient_name,
              sender_name, type, subject, preview, html_body, sent_at,
              is_read AS \`read\`
       FROM notifications
       ORDER BY sent_at DESC
       LIMIT 50`
    );
  } else {
    notifications = await query<EmailNotification>(
      `SELECT id, ticket_id, ticket_title, recipient_id, recipient_email, recipient_name,
              sender_name, type, subject, preview, html_body, sent_at,
              is_read AS \`read\`
       FROM notifications
       WHERE recipient_id = ?
       ORDER BY sent_at DESC
       LIMIT 50`,
      [user.id]
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}
