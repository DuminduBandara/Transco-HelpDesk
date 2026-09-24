import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { execute } from "@/lib/db";

export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await execute(
    "UPDATE notifications SET is_read = 1 WHERE recipient_id = ?",
    [user.id]
  );

  return NextResponse.json({ success: true });
}
