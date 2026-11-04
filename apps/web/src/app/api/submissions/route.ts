import { NextResponse } from "next/server";

// PUT /api/submissions — team submits/updates their delivery: a deploy link,
// a repo link, or a file/image for teams without code (UX fix #1)
export async function PUT() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
