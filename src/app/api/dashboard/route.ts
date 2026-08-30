import { NextResponse } from "next/server";
import { executeToolCall } from "@/lib/tool-executor";

export const maxDuration = 60; // Allow 60s for fetching from Monday.com

export async function GET() {
  try {
    const dealsResult = await executeToolCall("fetch_deals_data", {}) as any;
    const woResult = await executeToolCall("fetch_work_orders_data", {}) as any;

    if (dealsResult && "error" in dealsResult) {
      return NextResponse.json({ error: dealsResult.error }, { status: 400 });
    }
    if (woResult && "error" in woResult) {
      return NextResponse.json({ error: woResult.error }, { status: 400 });
    }

    return NextResponse.json({
      deals: dealsResult,
      workOrders: woResult,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch dashboard data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
