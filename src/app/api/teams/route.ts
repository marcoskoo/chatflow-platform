import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/teams - List all teams
export async function GET() {
  try {
    const teams = await db.team.findMany({
      orderBy: { createdAt: "desc" },
    });
    const formatted = teams.map(t => ({
      ...t,
      members: JSON.parse(t.members),
    }));
    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch teams" }, { status: 500 });
  }
}
