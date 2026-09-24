import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { updateUserSchema } from "@/lib/validators";
import { broadcastRealtimeEvent } from "@/lib/realtime";

// PATCH /api/users/:id — admin only. Update role, department, active flag,
// name, or reset password.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await query("SELECT id FROM users WHERE id = ?", [id]);
  if (!existing[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { password, ...rest } = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(rest)) {
    setClauses.push(`${key} = ?`);
    values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
  }

  if (password) {
    setClauses.push("password_hash = ?");
    values.push(await bcrypt.hash(password, 10));
  }

  if (setClauses.length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  values.push(id);
  await execute(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`, values);

  broadcastRealtimeEvent("users:updated", { id, updates: rest });

  return NextResponse.json({ success: true });
}
