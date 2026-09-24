import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { Category } from "@/types";

// GET /api/categories — any authenticated user (populates dropdowns)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await query<Category>(
    "SELECT id, name FROM categories ORDER BY name"
  );
  return NextResponse.json({ categories });
}
