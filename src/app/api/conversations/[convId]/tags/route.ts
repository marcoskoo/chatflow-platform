import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/conversations/[convId]/tags - List tags
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  try {
    const { convId } = await params;
    const tags = await db.tag.findMany({
      where: { conversationId: convId },
    });
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch tags" }, { status: 500 });
  }
}

// POST /api/conversations/[convId]/tags - Add a tag
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  try {
    const { convId } = await params;
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Tag name is required" }, { status: 400 });
    }

    const tag = await db.tag.create({
      data: {
        name,
        color: color || "#6366f1",
        conversationId: convId,
      },
    });

    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to add tag" }, { status: 500 });
  }
}
