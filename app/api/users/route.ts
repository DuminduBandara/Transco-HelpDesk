import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { createUserSchema } from "@/lib/validators";
import type { User } from "@/types";

// GET /api/users — admin only (also used to populate "assign to" dropdowns
// for agents, restricted to id/name/role there — see /api/users?role=agent
// which is allowed for agent/admin).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleFilter = req.nextUrl.searchParams.get("role");

  // Agents are allowed a narrow lookup (id/name) to populate assignee pickers.
  if (user.role === "agent") {
    if (roleFilter !== "agent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await query<Pick<User, "id" | "name">>(
      "SELECT id, name FROM users WHERE role = 'agent' AND is_active = 1 ORDER BY name"
    );
    return NextResponse.json({ users: rows });
  }

  if (!hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params: unknown[] = [];
  let sql =
    "SELECT id, name, email, role, department, is_active, created_at FROM users";
  if (roleFilter) {
    sql += " WHERE role = ?";
    params.push(roleFilter);
  }
  sql += " ORDER BY created_at DESC";

  const rows = await query<User>(sql, params);
  return NextResponse.json({ users: rows });
}

// POST /api/users — admin only, creates a new user account.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { name, email, password, role, department } = parsed.data;

  const existing = await query("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const password_hash = await bcrypt.hash(password, 10);

  const result = await execute(
    "INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)",
    [name, email, password_hash, role, department ?? null]
  );

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
