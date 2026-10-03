import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { createUserSchema } from "@/lib/validators";
import { sendEmail } from "@/lib/email";
import type { User } from "@/types";

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Background asynchronous email dispatch for user invitation
async function sendUserInvitationEmail(params: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePassword = escapeHtml(params.password);
  const safeRole = escapeHtml(params.role);
  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  const loginUrl = `${appUrl}/login`;
  const safeLoginUrl = escapeHtml(loginUrl);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #1976d2; margin-top: 0;">Welcome to Transco HelpDesk, ${safeName}!</h2>
      <p style="font-size: 15px; line-height: 1.5;">An administrator has set up a new account for you on the Transco IT HelpDesk portal.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #1976d2; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Portal URL:</strong> <a href="${safeLoginUrl}" style="color: #1976d2; text-decoration: none;">${safeLoginUrl}</a></p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Username (Email):</strong> ${safeEmail}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background-color: #edf2f7; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 15px; font-weight: bold; color: #2d3748;">${safePassword}</code></p>
        <p style="margin: 0; font-size: 14px;"><strong>Role:</strong> <span style="text-transform: capitalize; font-weight: 600;">${safeRole}</span></p>
      </div>

      <div style="background-color: #fff8e1; border-left: 4px solid #ffa000; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #b78103; font-weight: 600;">
          Important Security Notice:
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #5d4037;">
          You will be prompted to create your own permanent, secure password upon your first login before you can access the system.
        </p>
      </div>

      <p style="font-size: 14px; margin-top: 24px;">
        <a href="${safeLoginUrl}" style="background-color: #1976d2; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block;">
          Sign In to HelpDesk
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #888; margin: 0;">Transco IT HelpDesk System &bull; Please do not reply directly to this automated email.</p>
    </div>
  `;

  await sendEmail(params.email, "Your Transco HelpDesk Account Invitation & Login Details", emailHtml);
}

// GET /api/users — admin only (also used to populate "assign to" dropdowns for agents)
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
    "SELECT id, name, email, mobile_number, role, department, is_active, must_change_password, created_at FROM users";
  if (roleFilter) {
    sql += " WHERE role = ?";
    params.push(roleFilter);
  }
  sql += " ORDER BY created_at DESC";

  const rows = await query<User & { must_change_password?: number | boolean }>(sql, params);

  // Privacy rule: Admins can view all mobile numbers.
  // Non-admins can NEVER view admin mobile numbers.
  const sanitized = rows.map((u) => {
    const userItem: User = {
      ...u,
      is_active: Boolean(u.is_active),
      must_change_password: Boolean(u.must_change_password),
    };
    if (u.role === "admin" && user.role !== "admin" && u.id !== user.id) {
      userItem.mobile_number = null;
    }
    return userItem;
  });

  return NextResponse.json({ users: sanitized });
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
  const { name, email, mobile_number, password, role, department } = parsed.data;

  const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const password_hash = await bcrypt.hash(password, 10);

  const result = await execute(
    "INSERT INTO users (name, email, mobile_number, password_hash, role, department, must_change_password) VALUES (?, ?, ?, ?, ?, ?, 1)",
    [name, email, mobile_number?.trim() || null, password_hash, role, department ?? null]
  );

  // Send invitation email in the background without blocking HTTP response
  sendUserInvitationEmail({
    name,
    email,
    password,
    role,
  }).catch((error) => {
    console.error("[Email Error] Failed to send user welcome email:", error);
  });

  return NextResponse.json(
    {
      id: result.insertId,
      name,
      email,
      temporaryPassword: password,
    },
    { status: 201 }
  );
}