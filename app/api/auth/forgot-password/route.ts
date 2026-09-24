import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { execute, query } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validators";
import { sendPasswordResetEmail, isSmtpConfigured } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid email format." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    // Query user by email
    const users = await query<{
      id: number;
      name: string;
      email: string;
      is_active: number;
    }>("SELECT id, name, email, is_active FROM users WHERE email = ? LIMIT 1", [
      email,
    ]);

    const user = users[0];

    // If user does not exist or is deactivated, return uniform message to prevent enumeration
    if (!user || !user.is_active) {
      return NextResponse.json({
        success: true,
        message:
          "If an account with that email exists, we have sent instructions to reset your password.",
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // Token expires in 60 minutes
    const expiresAtDate = new Date(Date.now() + 60 * 60 * 1000);
    const expiresAt = expiresAtDate.toISOString().replace("T", " ").substring(0, 19);

    // Invalidate existing unused tokens for this user
    await execute(
      "UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
      [user.id]
    );

    // Insert new token record
    await execute(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    // Dispatch email notification
    const emailResult = await sendPasswordResetEmail({
      recipientEmail: user.email,
      recipientName: user.name,
      token,
      expiresMinutes: 60,
    });

    const smtpActive = isSmtpConfigured();

    return NextResponse.json({
      success: true,
      message:
        "A password reset link has been dispatched to your email address. It will expire in 60 minutes.",
      // In development / simulated mode, return the link directly for seamless testing
      devResetUrl: !smtpActive ? emailResult.resetUrl : undefined,
      simulated: !smtpActive,
    });
  } catch (err) {
    console.error("[Forgot Password Error]:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
