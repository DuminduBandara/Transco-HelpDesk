import { NextResponse } from "next/server";

// Comment functionality has been permanently disabled per system requirements.
export async function GET() {
  return NextResponse.json(
    { error: "Comment function has been disabled" },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Comment function has been disabled" },
    { status: 410 }
  );
}
