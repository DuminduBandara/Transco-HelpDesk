import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getDepartments, addDepartment, removeDepartment } from "@/lib/departments";

// GET /api/departments — list all active departments
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departments = await getDepartments();
  return NextResponse.json({ departments });
}

// POST /api/departments — add a new department (admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = body?.name ? String(body.name).trim() : "";

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "Department name must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (name.length > 80) {
    return NextResponse.json(
      { error: "Department name must not exceed 80 characters" },
      { status: 400 }
    );
  }

  const updated = addDepartment(name);
  return NextResponse.json({ ok: true, departments: updated }, { status: 201 });
}

// DELETE /api/departments — remove a department (admin only)
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Department name query parameter is required" },
      { status: 400 }
    );
  }

  const updated = removeDepartment(name);
  return NextResponse.json({ ok: true, departments: updated });
}
