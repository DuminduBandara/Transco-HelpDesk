import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { execute, query } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validators";

interface PasswordResetRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  used_at: string | null;
  user_email?: string;
  user_name?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        { valid: false, error: "Reset token is missing or malformed." },
        { status: 400 }
      );
    }

    const rows = await query<PasswordResetRow>(
      `SELECT pr.id, pr.user_id, pr.token, pr.expires_at, pr.used_at, u.email AS user_email, u.name AS user_name
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = ? LIMIT 1`,
      [token.trim()]
    );

    const reset = rows[0];

    if (!reset) {
      return NextResponse.json(
        { valid: false, error: "Invalid password reset token." },
        { status: 404 }
      );
    }

    if (reset.used_at) {
      return NextResponse.json(
        {
          valid: false,
          error: "This password reset link has already been used. Please request a new one.",
        },
        { status: 410 }
      );
    }

    const expiresAt = new Date(reset.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        {
          valid: false,
          error: "This password reset link has expired (links are valid for 60 minutes). Please request a new one.",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: reset.user_email,
      name: reset.user_name,
    });
  } catch (err) {
    console.error("[Verify Reset Token Error]:", err);
    return NextResponse.json(
      { valid: false, error: "Failed to verify reset token." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid password data." },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const rows = await query<PasswordResetRow>(
      `SELECT pr.id, pr.user_id, pr.token, pr.expires_at, pr.used_at, u.email AS user_email
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = ? LIMIT 1`,
      [token.trim()]
    );

    const reset = rows[0];

    if (!reset) {
      return NextResponse.json(
        { error: "Invalid password reset token." },
        { status: 404 }
      );
    }

    if (reset.used_at) {
      return NextResponse.json(
        { error: "This password reset link has already been used. Please request a new one." },
        { status: 410 }
      );
    }

    const expiresAt = new Date(reset.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { error: "This password reset link has expired. Please request a new one." },
        { status: 410 }
      );
    }

    // Hash the new password using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user's password
    await execute(
      "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
      [passwordHash, reset.user_id]
    );

    // Mark token as used
    await execute("UPDATE password_resets SET used_at = NOW() WHERE token = ?", [
      token.trim(),
    ]);

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully. You can now sign in.",
    });
  } catch (err) {
    console.error("[Reset Password POST Error]:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while resetting your password." },
      { status: 500 }
    );
  }
}
