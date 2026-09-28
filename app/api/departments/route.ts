import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { query, execute } from "@/lib/db";

// Helper function to automatically create the table if it's missing.
// This prevents 500 errors if the SQL script wasn't run manually.
async function ensureDepartmentsTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// GET /api/departments - Fetch all departments (Accessible by any logged-in user)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDepartmentsTable();

    // 1. Fetch departments from the database
    const rows = await query("SELECT name FROM departments ORDER BY name ASC") as any[];
    const departmentNames = rows.map((row) => row.name);
    
    // 2. Fallback check: include any distinct departments assigned to existing users
    const userDepts = await query(
      "SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != ''"
    ) as any[];
    
    const set = new Set<string>(departmentNames);
    for (const row of userDepts) {
      if (row.department && row.department.trim()) {
        set.add(row.department.trim());
      }
    }

    return NextResponse.json({ departments: Array.from(set).sort((a, b) => a.localeCompare(b)) });
  } catch (error: any) {
    console.error("GET Departments Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments", details: error.message }, 
      { status: 500 }
    );
  }
}

// POST /api/departments - Create a new department (Admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 });
    }

    const cleanName = name.trim();

    await ensureDepartmentsTable();

    // Insert into database
    await execute("INSERT INTO departments (name) VALUES (?)", [cleanName]);

    // Return the newly updated list of departments
    const rows = await query("SELECT name FROM departments ORDER BY name ASC") as any[];
    const departmentNames = rows.map((row) => row.name);

    return NextResponse.json({ departments: departmentNames }, { status: 201 });
  } catch (error: any) {
    console.error("POST Departments Error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "This department already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create department", details: error.message }, 
      { status: 500 }
    );
  }
}

// DELETE /api/departments - Delete a department (Admin only)
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Department name is required" }, { status: 400 });
  }

  try {
    await ensureDepartmentsTable();

    // Safety Check: Prevent deleting a department if users are still assigned to it
    const usersInDept = await query(
      "SELECT COUNT(*) as count FROM users WHERE department = ?",
      [name]
    ) as any[];

    if (usersInDept && usersInDept[0].count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete: ${usersInDept[0].count} user(s) are currently assigned to this department.` 
      }, { status: 400 });
    }

    const result = await execute("DELETE FROM departments WHERE name = ?", [name]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Return the newly updated list of departments
    const rows = await query("SELECT name FROM departments ORDER BY name ASC") as any[];
    const departmentNames = rows.map((row) => row.name);

    return NextResponse.json({ departments: departmentNames, success: true });
  } catch (error: any) {
    console.error("DELETE Departments Error:", error);
    return NextResponse.json(
      { error: "Failed to delete department", details: error.message }, 
      { status: 500 }
    );
  }
}