import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/webhook/[channel] - Receive messages from external channels
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  try {
    const { channel } = await params;
    const body = await request.json();

    let contactName = "";
    let messageContent = "";

    switch (channel) {
      case "whatsapp":
        contactName = body.contact?.name || body.From?.split(":")[1] || "WhatsApp User";
        messageContent = body.message?.text || body.Body || "";
        break;
      case "messenger":
        contactName = body.sender?.name || body.entry?.[0]?.messaging?.[0]?.sender?.id || "Messenger User";
        messageContent = body.message?.text || body.entry?.[0]?.messaging?.[0]?.message?.text || "";
        break;
      case "instagram":
        contactName = body.sender?.name || "Instagram User";
        messageContent = body.message?.text || "";
        break;
      case "telegram":
        contactName = body.message?.from?.first_name || "Telegram User";
        messageContent = body.message?.text || "";
        break;
      default:
        contactName = body.contactName || body.sender || "User";
        messageContent = body.message || body.text || body.content || "";
    }

    if (!messageContent) {
      return NextResponse.json(
        { success: false, error: "No message content found" },
        { status: 400 }
      );
    }

    const botId = body.botId || "default";
    let conversation = await db.conversation.findFirst({
      where: { botId, channel, contactName, status: { in: ["active", "pending"] } },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          botId,
          channel,
          contactName,
          status: "active",
          unread: 1,
          lastMessage: messageContent.substring(0, 100),
        },
      });
    } else {
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: messageContent.substring(0, 100),
          unread: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        sender: "user",
        content: messageContent,
        type: "text",
        isBot: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: { conversationId: conversation.id, message: "Message received" },
    });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process webhook" }, { status: 500 });
  }
}

// GET - Webhook verification for channels like WhatsApp/Meta
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: "ok",
    channel,
    message: "Webhook endpoint active. Configure this URL in your channel settings.",
  });
}
