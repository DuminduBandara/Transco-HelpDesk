import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { createUserSchema } from "@/lib/validators";
import { sendEmail } from '@/lib/email';
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
    "SELECT id, name, email, mobile_number, role, department, is_active, created_at FROM users";
  if (roleFilter) {
    sql += " WHERE role = ?";
    params.push(roleFilter);
  }
  sql += " ORDER BY created_at DESC";

  const rows = await query<User>(sql, params);

  // Privacy rule: Admins can view all mobile numbers.
  // Non-admins can NEVER view admin mobile numbers.
  const sanitized = rows.map((u) => {
    if (u.role === "admin" && user.role !== "admin" && u.id !== user.id) {
      return { ...u, mobile_number: null };
    }
    return u;
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
    "INSERT INTO users (name, email, mobile_number, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)",
    [name, email, mobile_number?.trim() || null, password_hash, role, department ?? null]
  );

  // --- EMAIL INVITATION TRIGGER ---
  // Send the invitation email to ALL newly created users
  try {
    const emailHtml = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #0056b3;">Welcome to Transco HelpDesk, ${name}!</h2>
        <p>An administrator has created a new account for you.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>
          <p style="margin: 10px 0 0 0;"><strong>Role:</strong> <span style="text-transform: capitalize;">${role}</span></p>
        </div>
        <p>Please log in and navigate to your profile to change your password immediately.</p>
      </div>
    `;
    
    await sendEmail(email, 'Your Transco HelpDesk Account Invitation', emailHtml);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // User is created successfully even if email fails
  }
  // --------------------------------

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}