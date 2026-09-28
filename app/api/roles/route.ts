// app/api/roles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";

// GET /api/roles - Fetch all roles (Accessible by any logged-in user)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await query("SELECT * FROM roles ORDER BY id ASC");
    return NextResponse.json({ roles: rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

// POST /api/roles - Create a new role (Admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, color_code } = body;

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');

    const result = await execute(
      "INSERT INTO roles (name, description, color_code) VALUES (?, ?, ?)",
      [cleanName, description?.trim() || null, color_code?.trim() || 'default']
    );

    return NextResponse.json({ id: result.insertId, name: cleanName }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}

// DELETE /api/roles - Delete a role (Admin only)
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Role name is required" }, { status: 400 });
  }

  // Security layer: Prevent accidental deletion of core system roles
  if (["admin", "agent", "employee"].includes(name.toLowerCase())) {
    return NextResponse.json({ error: "Cannot delete core system roles" }, { status: 403 });
  }

  try {
    // Prevent deletion if users are currently assigned this role
    const usersWithRole = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE role = ?",
      [name]
    );

    if (usersWithRole && usersWithRole[0].count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete: ${usersWithRole[0].count} user(s) currently have this role.` 
      }, { status: 400 });
    }

    await execute("DELETE FROM roles WHERE name = ?", [name]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}