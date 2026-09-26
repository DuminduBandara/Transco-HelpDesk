import { NextResponse } from "next/server";
import { getDbConnectionStatus, query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  const status = await getDbConnectionStatus();

  let ticketCount = 0;
  let userCount = 0;
  try {
    const ticketRows = await query<{ count: number }>("SELECT COUNT(*) AS count FROM tickets");
    ticketCount = ticketRows[0]?.count ?? 0;
    const userRows = await query<{ count: number }>("SELECT COUNT(*) AS count FROM users");
    userCount = userRows[0]?.count ?? 0;
  } catch {
    // ignore
  }

  return NextResponse.json({
    ...status,
    authenticatedUser: user ? { id: user.id, email: user.email, role: user.role } : null,
    metrics: {
      tickets: ticketCount,
      users: userCount,
    },
    help: status.connected
      ? "MySQL is connected and active. All tickets and users are being stored directly in MySQL."
      : "MySQL is NOT connected. The app is running in in-memory fallback mode, so tickets are saved in RAM only. Please check your DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, and DB_NAME in your environment configuration.",
  });
}
