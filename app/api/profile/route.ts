import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { query, execute } from "@/lib/db";

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  department: z.string().trim().max(120).optional().nullable(),
  mobile_number: z.string().trim().max(30).optional().nullable(),
  current_password: z.string().optional(),
  new_password: z.string().min(6, "New password must be at least 6 characters").optional(),
});

// GET /api/profile — fetch logged-in user profile details
export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await query<{
    id: number;
    name: string;
    email: string;
    mobile_number: string | null;
    role: string;
    department: string | null;
    created_at: string;
  }>(
    "SELECT id, name, email, mobile_number, role, department, created_at FROM users WHERE id = ? LIMIT 1",
    [sessionUser.id]
  );

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// PATCH /api/profile — update profile (name, department, mobile_number, password)
export async function PATCH(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, department, mobile_number, current_password, new_password } = parsed.data;

  // Retrieve current user row including password_hash
  const userRows = await query<{
    id: number;
    password_hash: string;
  }>("SELECT id, password_hash FROM users WHERE id = ? LIMIT 1", [sessionUser.id]);

  const existingUser = userRows[0];
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const setClauses: string[] = ["name = ?", "department = ?", "mobile_number = ?"];
  const values: unknown[] = [
    name,
    department ?? null,
    mobile_number !== undefined ? (mobile_number ? mobile_number.trim() : null) : null,
  ];

  // If user is trying to change password
  if (new_password) {
    if (!current_password) {
      return NextResponse.json(
        { error: "Current password is required to set a new password." },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(current_password, existingUser.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect current password." },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(new_password, 10);
    setClauses.push("password_hash = ?");
    values.push(newHash);
  }

  values.push(sessionUser.id);

  await execute(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );

  return NextResponse.json({
    ok: true,
    message: "Profile updated successfully.",
    user: {
      id: sessionUser.id,
      name,
      department: department ?? null,
      mobile_number: mobile_number ?? null,
    },
  });
}
