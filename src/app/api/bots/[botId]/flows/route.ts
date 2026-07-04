import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bots/[botId]/flows - List flows for a bot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    const flows = await db.flow.findMany({
      where: { botId },
      orderBy: { createdAt: "desc" },
    });
    const formatted = flows.map(f => ({
      ...f,
      nodes: JSON.parse(f.nodes),
      edges: JSON.parse(f.edges),
      trigger: JSON.parse(f.trigger),
    }));
    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch flows" },
      { status: 500 }
    );
  }
}

// POST /api/bots/[botId]/flows - Create a new flow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    const body = await request.json();
    const { name, nodes, edges, trigger, isActive } = body;

    const flow = await db.flow.create({
      data: {
        name: name || "Nuevo Flujo",
        botId,
        nodes: nodes ? JSON.stringify(nodes) : "[]",
        edges: edges ? JSON.stringify(edges) : "[]",
        trigger: trigger ? JSON.stringify(trigger) : "{}",
        isActive: isActive ?? false,
      },
    });

    return NextResponse.json({ success: true, data: flow }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create flow" },
      { status: 500 }
    );
  }
}
