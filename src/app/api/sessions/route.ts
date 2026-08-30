import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentSessions, conversations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const sessions = await db
    .select()
    .from(agentSessions)
    .orderBy(desc(agentSessions.updatedAt))
    .limit(20);

  return NextResponse.json({ sessions });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  await db.delete(conversations).where(eq(conversations.sessionId, sessionId));
  await db.delete(agentSessions).where(eq(agentSessions.sessionId, sessionId));

  return NextResponse.json({ success: true });
}
