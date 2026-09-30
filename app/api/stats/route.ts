import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/stats — ticket counts by status (+ priority breakdown).
// Agents see stats across all tickets too (useful for triage); employees
// don't get this endpoint since it's not relevant to their scoped view.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
  }

  const byStatus = await query<{ status: string; count: number }>(
    "SELECT status, COUNT(*) AS count FROM tickets GROUP BY status"
  );
  const byPriority = await query<{ priority: string; count: number }>(
    "SELECT priority, COUNT(*) AS count FROM tickets GROUP BY priority"
  );
  const unassigned = await query<{ count: number }>(
    "SELECT COUNT(*) AS count FROM tickets WHERE assigned_to IS NULL AND status != 'closed'"
  );
  const totalUsers = hasRole(user, ["admin"])
    ? await query<{ count: number }>("SELECT COUNT(*) AS count FROM users")
    : null;

  return NextResponse.json({
    byStatus,
    byPriority,
    unassigned: unassigned[0]?.count ?? 0,
    totalUsers: totalUsers ? totalUsers[0]?.count ?? 0 : undefined,
  });
}
