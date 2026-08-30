import { NextResponse } from "next/server";
import { fetchBoards } from "@/lib/monday-client";
import { db } from "@/db";
import { boardCache } from "@/db/schema";

export async function GET() {
  try {
    const boards = await fetchBoards();
    
    // Also get cached board info
    const cached = await db.select().from(boardCache);
    const cachedMap = new Map(cached.map((c) => [c.boardId, c]));

    const enriched = boards.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      columnCount: b.columns?.length ?? 0,
      cached: cachedMap.has(b.id),
      cachedAt: cachedMap.get(b.id)?.lastFetched ?? null,
      itemCount: cachedMap.get(b.id)?.itemCount ?? null,
      boardType: cachedMap.get(b.id)?.boardType ?? null,
    }));

    return NextResponse.json({ boards: enriched, total: boards.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch boards";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
