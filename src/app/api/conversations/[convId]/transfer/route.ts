import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/conversations/[convId]/transfer - Transfer conversation to team/agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  try {
    const { convId } = await params;
    const body = await request.json();
    const { team, assignedTo } = body;

    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team is required" },
        { status: 400 }
      );
    }

    const conversation = await db.conversation.update({
      where: { id: convId },
      data: {
        team,
        assignedTo: assignedTo || null,
        status: "pending",
      },
    });

    // Add a transfer message
    await db.message.create({
      data: {
        conversationId: convId,
        sender: "bot",
        content: `Conversación transferida al equipo ${team}${assignedTo ? ` - Agente: ${assignedTo}` : ""}. Un momento por favor...`,
        type: "transfer",
        isBot: true,
      },
    });

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to transfer conversation" },
      { status: 500 }
    );
  }
}
