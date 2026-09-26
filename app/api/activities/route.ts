import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { ActivityItem } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(1, Number(searchParams.get("limit") || "15")),
    50
  );

  try {
    const isEmployee = user.role === "employee";
    const employeeFilter = isEmployee ? "WHERE t.created_by = ?" : "";
    const employeeAndFilter = isEmployee ? "AND t.created_by = ?" : "";

    const sql = `
      SELECT * FROM (
        SELECT
          CONCAT('comment_', tc.id) AS id,
          'comment' AS type,
          tc.ticket_id,
          t.title AS ticket_title,
          t.status AS ticket_status,
          t.priority AS ticket_priority,
          tc.user_id,
          u.name AS user_name,
          u.role AS user_role,
          tc.comment AS details,
          tc.created_at
        FROM ticket_comments tc
        JOIN tickets t ON t.id = tc.ticket_id
        JOIN users u ON u.id = tc.user_id
        ${employeeFilter}

        UNION ALL

        SELECT
          CONCAT('created_', t.id) AS id,
          'ticket_created' AS type,
          t.id AS ticket_id,
          t.title AS ticket_title,
          t.status AS ticket_status,
          t.priority AS ticket_priority,
          t.created_by AS user_id,
          cu.name AS user_name,
          cu.role AS user_role,
          CONCAT('Created ticket with ', t.priority, ' priority') AS details,
          t.created_at
        FROM tickets t
        JOIN users cu ON cu.id = t.created_by
        ${employeeFilter}

        UNION ALL

        SELECT
          CONCAT('status_', t.id) AS id,
          'status_change' AS type,
          t.id AS ticket_id,
          t.title AS ticket_title,
          t.status AS ticket_status,
          t.priority AS ticket_priority,
          COALESCE(t.assigned_to, t.created_by) AS user_id,
          COALESCE(au.name, cu.name) AS user_name,
          COALESCE(au.role, cu.role) AS user_role,
          CONCAT('Status updated to ', REPLACE(t.status, '_', ' ')) AS details,
          t.updated_at AS created_at
        FROM tickets t
        LEFT JOIN users au ON au.id = t.assigned_to
        LEFT JOIN users cu ON cu.id = t.created_by
        WHERE t.status != 'open' AND t.updated_at > t.created_at
        ${employeeAndFilter}
      ) AS combined_activity
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const params: (number | string)[] = [];
    if (isEmployee) {
      params.push(user.id, user.id, user.id);
    }
    params.push(limit);

    const activities = await query<ActivityItem>(sql, params);
    return NextResponse.json({ activities: activities ?? [] });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities", activities: [] },
      { status: 500 }
    );
  }
}
