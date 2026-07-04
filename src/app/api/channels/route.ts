import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/channels - List all channels
export async function GET() {
  try {
    const channels = await db.channel.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: channels });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch channels" }, { status: 500 });
  }
}
