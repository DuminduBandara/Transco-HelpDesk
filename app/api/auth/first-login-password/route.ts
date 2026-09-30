import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { query, execute } from "@/lib/db";

const firstLoginPasswordSchema = z.object({
  new_password: z.string().min(8, "New password must be at least 8 characters long"),
  confirm_password: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "New passwords do not match",
  path: ["confirm_password"],
});

export async function POST(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = firstLoginPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.errors[0]?.message || "Validation error";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { new_password } = parsed.data;

  // Fetch current user row from database
  const rows = await query<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
    [sessionUser.id]
  );
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "User account not found" }, { status: 404 });
  }

  // Prevent user from setting their new password to the exact same temporary password
  const isSameAsTemp = await bcrypt.compare(new_password, user.password_hash);
  if (isSameAsTemp) {
    return NextResponse.json(
      { error: "Your new password cannot be the same as your temporary password. Please choose a different password." },
      { status: 400 }
    );
  }

  // Hash new password and clear the must_change_password flag
  const newHash = await bcrypt.hash(new_password, 10);
  await execute(
    "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
    [newHash, sessionUser.id]
  );

  return NextResponse.json({
    success: true,
    message: "Password changed successfully. You may now access the system.",
  });
}
