import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/conversations/[convId]/notes - List notes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  try {
    const { convId } = await params;
    const notes = await db.note.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST /api/conversations/[convId]/notes - Add a note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  try {
    const { convId } = await params;
    const body = await request.json();
    const { content, author } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: "Note content is required" }, { status: 400 });
    }

    const note = await db.note.create({
      data: {
        content,
        author: author || "API",
        conversationId: convId,
      },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to add note" }, { status: 500 });
  }
}
