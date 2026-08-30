import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/ai-agent";
import { executeToolCall } from "@/lib/tool-executor";
import { db } from "@/db";
import { conversations, agentSessions } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      message: string;
      sessionId: string;
    };
    const { message, sessionId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Ensure session exists
    await db
      .insert(agentSessions)
      .values({
        sessionId,
        title: message.slice(0, 80),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: agentSessions.sessionId,
        set: { updatedAt: new Date() },
      });

    // Load conversation history
    const history = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, sessionId))
      .orderBy(asc(conversations.createdAt))
      .limit(20);

    const conversationHistory: ChatCompletionMessageParam[] = history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    // Save user message
    await db.insert(conversations).values({
      sessionId,
      role: "user",
      content: message,
    });

    // Run agent
    const response = await runAgent(message, conversationHistory, executeToolCall);

    // Save assistant response
    await db.insert(conversations).values({
      sessionId,
      role: "assistant",
      content: response.message,
      metadata: response.metadata as Record<string, unknown> ?? null,
    });

    return NextResponse.json({
      message: response.message,
      toolsUsed: response.toolsUsed,
      metadata: response.metadata,
      sessionId,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const errMsg = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const history = await db
    .select()
    .from(conversations)
    .where(eq(conversations.sessionId, sessionId))
    .orderBy(asc(conversations.createdAt));

  return NextResponse.json({ history });
}
