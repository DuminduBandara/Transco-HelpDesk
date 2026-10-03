import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { updateUserSchema } from "@/lib/validators";

// PATCH /api/users/:id — admin only. Update email, role, department, active flag,
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
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
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

  const existing = await query<{ id: number; role: string }>("SELECT id, role FROM users WHERE id = ?", [id]);
  if (!existing[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { password, email, ...rest } = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];

  // Check email uniqueness if email is changed
  if (email) {
    const emailConflict = await query<{ id: number }>(
      "SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1",
      [email.toLowerCase(), id]
    );
    if (emailConflict && emailConflict.length > 0) {
      return NextResponse.json(
        { error: "This email address is already in use by another user." },
        { status: 409 }
      );
    }
    setClauses.push("email = ?");
    values.push(email.toLowerCase());
  }

  for (const [key, value] of Object.entries(rest)) {
    // If target user is an admin profile, do not allow changing is_active to false
    if (key === "is_active" && existing[0].role === "admin") {
      setClauses.push("is_active = 1");
      continue;
    }
    setClauses.push(`${key} = ?`);
    values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
  }

  if (password) {
    setClauses.push("password_hash = ?");
    values.push(await bcrypt.hash(password, 10));
    setClauses.push("must_change_password = 1");
  }

  if (setClauses.length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  values.push(id);
  await execute(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`, values);

  return NextResponse.json({ success: true });
}

// DELETE /api/users/:id — admin only. Delete a user account.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const targetId = Number(params.id);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  // Prevent admin from deleting their own account
  if (user.id === targetId) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account." },
      { status: 400 }
    );
  }

  const existing = await query<{ id: number; name: string }>(
    "SELECT id, name FROM users WHERE id = ?",
    [targetId]
  );
  if (!existing[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Foreign key maintenance:
  // 1. Reassign tickets created by target user to the current admin
  await execute("UPDATE tickets SET created_by = ? WHERE created_by = ?", [
    user.id,
    targetId,
  ]);

  // 2. Unassign any tickets assigned to target user
  await execute("UPDATE tickets SET assigned_to = NULL WHERE assigned_to = ?", [
    targetId,
  ]);

  // 3. Delete the user
  await execute("DELETE FROM users WHERE id = ?", [targetId]);

  return NextResponse.json({
    success: true,
    message: `User '${existing[0].name}' deleted successfully.`,
  });
}
