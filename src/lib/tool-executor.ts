/**
 * Tool Executor - Handles AI agent tool calls
 * Connects the AI agent to Monday.com data and analytics
 */

import { fetchBoards, fetchCompleteBoard, boardToDataset } from "./monday-client";
import {
  normalizeDeal,
  normalizeWorkOrder,
  type NormalizedDeal,
  type NormalizedWorkOrder,
} from "./data-normalizer";
import {
  computePipelineMetrics,
  computeRevenueMetrics,
  computeOperationalMetrics,
  formatCurrency,
  formatNumber,
} from "./analytics";
import { db } from "@/db";
import { boardCache } from "@/db/schema";
import { eq } from "drizzle-orm";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedBoardData {
  items: Array<Record<string, string | null>>;
  boardName: string;
  boardId: string;
  fetchedAt: string;
  columns: string[];
}

async function getCachedOrFetch(boardId: string, boardType: string): Promise<CachedBoardData> {
  // Check cache
  try {
    const cached = await db
      .select()
      .from(boardCache)
      .where(eq(boardCache.boardId, boardId))
      .limit(1);

    if (cached.length > 0) {
      const cacheAge = Date.now() - new Date(cached[0].lastFetched).getTime();
      if (cacheAge < CACHE_TTL_MS && !cached[0].isStale) {
        return cached[0].data as unknown as CachedBoardData;
      }
    }
  } catch {
    // Cache miss or DB error - fetch fresh
  }

  // Fetch from Monday.com
  const boardData = await fetchCompleteBoard(boardId);
  const dataset = boardToDataset(boardData);

  const cacheData: CachedBoardData = {
    items: dataset.rows,
    boardName: boardData.board.name,
    boardId,
    fetchedAt: boardData.fetchedAt,
    columns: dataset.columns,
  };

  // Update cache
  try {
    await db
      .insert(boardCache)
      .values({
        boardId,
        boardName: boardData.board.name,
        boardType,
        data: cacheData as unknown as Record<string, unknown>,
        itemCount: dataset.rows.length,
        lastFetched: new Date(),
        isStale: false,
      })
      .onConflictDoUpdate({
        target: boardCache.boardId,
        set: {
          data: cacheData as unknown as Record<string, unknown>,
          itemCount: dataset.rows.length,
          lastFetched: new Date(),
          isStale: false,
          boardName: boardData.board.name,
        },
      });
  } catch {
    // Cache update failed - continue with fresh data
  }

  return cacheData;
}

async function findBoardByType(type: "deals" | "work_orders"): Promise<string | null> {
  // Check explicit env var overrides first
  if (type === "deals" && process.env.MONDAY_DEALS_BOARD_ID) {
    return process.env.MONDAY_DEALS_BOARD_ID;
  }
  if (type === "work_orders" && process.env.MONDAY_WO_BOARD_ID) {
    return process.env.MONDAY_WO_BOARD_ID;
  }

  // Check cache for known boards
  try {
    const cached = await db
      .select()
      .from(boardCache)
      .where(eq(boardCache.boardType, type))
      .limit(1);
    if (cached.length > 0) return cached[0].boardId;
  } catch {
    // continue
  }

  // Fetch all boards and detect by name
  const boards = await fetchBoards();
  const dealKeywords = ["deal", "pipeline", "sales", "crm", "funnel"];
  const woKeywords = ["work order", "work_order", "workorder", "tracker", "project", "execution"];

  const keywords = type === "deals" ? dealKeywords : woKeywords;

  for (const board of boards) {
    const name = board.name.toLowerCase();
    if (keywords.some((k) => name.includes(k))) {
      return board.id;
    }
  }

  // Return first board if only one exists
  if (boards.length === 1) return boards[0].id;
  if (boards.length >= 2) {
    return type === "deals" ? boards[0].id : boards[1].id;
  }

  return null;
}

export async function executeToolCall(
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "fetch_boards": {
      const boards = await fetchBoards();
      return {
        boards: boards.map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          columnCount: b.columns?.length ?? 0,
          columns: b.columns?.map((c) => ({ id: c.id, title: c.title, type: c.type })) ?? [],
        })),
        totalBoards: boards.length,
        message: `Found ${boards.length} board(s) in your Monday.com workspace`,
      };
    }

    case "fetch_deals_data": {
      let boardId = toolArgs.board_id as string | undefined;

      if (!boardId) {
        boardId = (await findBoardByType("deals")) ?? undefined;
        if (!boardId) {
          return {
            error: "Could not find deals board. Please configure MONDAY_DEALS_BOARD_ID or ensure a deals board exists.",
          };
        }
      }

      const cacheData = await getCachedOrFetch(boardId, "deals");
      const deals: NormalizedDeal[] = cacheData.items.map(normalizeDeal);

      // Apply filters
      let filteredDeals = deals;
      if (toolArgs.filter_sector) {
        const sector = (toolArgs.filter_sector as string).toLowerCase();
        filteredDeals = deals.filter((d) => d.sector?.toLowerCase().includes(sector));
      }
      if (toolArgs.filter_status) {
        const status = (toolArgs.filter_status as string).toLowerCase();
        filteredDeals = deals.filter((d) => d.status?.toLowerCase().includes(status));
      }

      const metrics = computePipelineMetrics(filteredDeals);

      // Prepare summary stats for AI
      const topSectors = Object.entries(metrics.dealsBySector)
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 5)
        .map(([sector, data]) => ({
          sector,
          dealCount: data.count,
          totalValue: formatCurrency(data.value),
        }));

      const topStages = Object.entries(metrics.dealsByStage)
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 8)
        .map(([stage, data]) => ({
          stage,
          dealCount: data.count,
          totalValue: formatCurrency(data.value),
        }));

      const recentDeals = filteredDeals
        .filter((d) => d.dealValue !== null && d.dealValue > 0)
        .sort((a, b) => (b.dealValue ?? 0) - (a.dealValue ?? 0))
        .slice(0, 10)
        .map((d) => ({
          name: d.name,
          sector: d.sector,
          status: d.status,
          stage: d.dealStage,
          value: d.dealValue ? formatCurrency(d.dealValue) : "N/A",
          probability: d.closureProbability ? `${d.closureProbability}%` : "N/A",
          owner: d.ownerCode,
          closeDate: d.closeDate ?? d.tentativeCloseDate ?? "N/A",
        }));

      return {
        boardId,
        boardName: cacheData.boardName,
        fetchedAt: cacheData.fetchedAt,
        summary: {
          totalDeals: metrics.totalDeals,
          filteredDeals: filteredDeals.length,
          totalPipelineValue: formatCurrency(metrics.totalPipelineValue),
          weightedPipelineValue: formatCurrency(metrics.weightedPipelineValue),
          avgDealValue: formatCurrency(metrics.avgDealValue),
          avgClosureProbability: `${metrics.avgClosureProbability.toFixed(1)}%`,
          wonDeals: `${metrics.wonDeals.count} deals worth ${formatCurrency(metrics.wonDeals.value)}`,
          lostDeals: `${metrics.lostDeals.count} deals worth ${formatCurrency(metrics.lostDeals.value)}`,
          conversionRate: `${metrics.conversionRate.toFixed(1)}%`,
          dataCompleteness: `${metrics.dataQuality.completenessPercent}%`,
        },
        topSectors,
        topStages,
        dealsByStatus: Object.entries(metrics.dealsByStatus).slice(0, 10).map(([status, data]) => ({
          status,
          count: data.count,
          value: formatCurrency(data.value),
        })),
        dealsByOwner: Object.entries(metrics.dealsByOwner)
          .sort((a, b) => b[1].value - a[1].value)
          .slice(0, 10)
          .map(([owner, data]) => ({
            owner,
            count: data.count,
            value: formatCurrency(data.value),
          })),
        topDeals: recentDeals,
        dataQualityNote:
          metrics.dataQuality.completenessPercent < 80
            ? `⚠️ Data completeness is ${metrics.dataQuality.completenessPercent}%. Some analysis may be approximate.`
            : null,
        metadata: {
          type: "deals",
          hasData: true,
          data: {
            metrics,
            deals: filteredDeals.slice(0, 50),
          },
          charts: {
            bySector: Object.entries(metrics.dealsBySector).map(([name, v]) => ({
              name,
              value: v.value,
              count: v.count,
            })),
            byStage: Object.entries(metrics.dealsByStage).map(([name, v]) => ({
              name,
              value: v.value,
              count: v.count,
            })),
            byStatus: Object.entries(metrics.dealsByStatus).map(([name, v]) => ({
              name,
              value: v.value,
              count: v.count,
            })),
          },
        },
      };
    }

    case "fetch_work_orders_data": {
      let boardId = toolArgs.board_id as string | undefined;

      if (!boardId) {
        boardId = (await findBoardByType("work_orders")) ?? undefined;
        if (!boardId) {
          return {
            error: "Could not find work orders board. Please configure MONDAY_WO_BOARD_ID or ensure a work orders board exists.",
          };
        }
      }

      const cacheData = await getCachedOrFetch(boardId, "work_orders");
      const workOrders: NormalizedWorkOrder[] = cacheData.items.map(normalizeWorkOrder);

      // Apply filters
      let filteredWOs = workOrders;
      if (toolArgs.filter_sector) {
        const sector = (toolArgs.filter_sector as string).toLowerCase();
        filteredWOs = workOrders.filter((w) => w.sector?.toLowerCase().includes(sector));
      }
      if (toolArgs.filter_status) {
        const status = (toolArgs.filter_status as string).toLowerCase();
        filteredWOs = workOrders.filter((w) => w.executionStatus?.toLowerCase().includes(status));
      }

      const revenue = computeRevenueMetrics(filteredWOs);
      const ops = computeOperationalMetrics(filteredWOs);

      return {
        boardId,
        boardName: cacheData.boardName,
        fetchedAt: cacheData.fetchedAt,
        summary: {
          totalWorkOrders: ops.totalWorkOrders,
          filteredWorkOrders: filteredWOs.length,
          totalBilled: formatCurrency(revenue.totalBilled),
          totalCollected: formatCurrency(revenue.totalCollected),
          totalReceivable: formatCurrency(revenue.totalReceivable),
          collectionRate: `${revenue.collectionRate.toFixed(1)}%`,
          completionRate: `${ops.completionRate.toFixed(1)}%`,
          avgProjectDuration: ops.avgProjectDuration
            ? `${Math.round(ops.avgProjectDuration)} days`
            : "N/A",
          overdueReceivables: `${revenue.overdueReceivables.count} accounts, ${formatCurrency(revenue.overdueReceivables.amount)}`,
        },
        revenueByStatus: Object.entries(revenue.byStatus)
          .sort((a, b) => b[1].billed - a[1].billed)
          .slice(0, 10)
          .map(([status, data]) => ({
            status,
            count: data.count,
            billed: formatCurrency(data.billed),
            collected: formatCurrency(data.collected),
          })),
        revenueBySector: Object.entries(revenue.bySector)
          .sort((a, b) => b[1].billed - a[1].billed)
          .slice(0, 10)
          .map(([sector, data]) => ({
            sector,
            count: data.count,
            billed: formatCurrency(data.billed),
            collected: formatCurrency(data.collected),
          })),
        revenueByWorkType: Object.entries(revenue.byTypeOfWork)
          .sort((a, b) => b[1].billed - a[1].billed)
          .slice(0, 10)
          .map(([type, data]) => ({
            type,
            count: data.count,
            billed: formatCurrency(data.billed),
            collected: formatCurrency(data.collected),
          })),
        topCustomers: revenue.topCustomers.slice(0, 10).map((c) => ({
          ...c,
          billed: formatCurrency(c.billed),
          collected: formatCurrency(c.collected),
        })),
        executionStatusBreakdown: Object.entries(ops.byExecutionStatus).slice(0, 10).map(([status, count]) => ({
          status,
          count,
          percentage: `${((count / ops.totalWorkOrders) * 100).toFixed(1)}%`,
        })),
        sectorBreakdown: Object.entries(ops.bySector)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([sector, count]) => ({
            sector,
            count,
          })),
        arPriority: Object.entries(ops.arPriorityBreakdown).slice(0, 10).map(([priority, count]) => ({
          priority,
          count,
        })),
        metadata: {
          type: "work_orders",
          hasData: true,
          data: {
            revenue,
            ops,
            workOrders: filteredWOs.slice(0, 50),
          },
          charts: {
            bySector: Object.entries(revenue.bySector).map(([name, v]) => ({
              name,
              billed: v.billed,
              collected: v.collected,
              count: v.count,
            })),
            byStatus: Object.entries(ops.byExecutionStatus).map(([name, count]) => ({
              name,
              count,
            })),
            monthly: Object.entries(revenue.monthlyBilling)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([month, billed]) => ({
                month,
                billed,
                collected: revenue.monthlyCollection[month] ?? 0,
              })),
          },
        },
      };
    }

    case "cross_board_analysis": {
      const dealsResult = await executeToolCall("fetch_deals_data", {
        board_id: toolArgs.deals_board_id,
      });
      const woResult = await executeToolCall("fetch_work_orders_data", {
        board_id: toolArgs.work_orders_board_id,
      });

      const dr = dealsResult as Record<string, unknown>;
      const wr = woResult as Record<string, unknown>;

      return {
        analysisType: toolArgs.analysis_type,
        dealsSummary: dr.summary,
        workOrdersSummary: wr.summary,
        crossInsights: {
          pipelineVsRevenue: `Pipeline value: ${(dr.summary as Record<string, string>)?.totalPipelineValue ?? "N/A"} | Actual billed: ${(wr.summary as Record<string, string>)?.totalBilled ?? "N/A"}`,
          conversionToExecution: `${(dr.summary as Record<string, string>)?.conversionRate ?? "N/A"} deal conversion | ${(wr.summary as Record<string, string>)?.completionRate ?? "N/A"} execution completion`,
        },
        metadata: {
          type: "cross_board",
          hasData: true,
          data: { deals: dr, workOrders: wr },
        },
      };
    }

    case "generate_leadership_update": {
      const dealsResult = await executeToolCall("fetch_deals_data", {});
      const woResult = await executeToolCall("fetch_work_orders_data", {});

      const dr = dealsResult as Record<string, unknown>;
      const wr = woResult as Record<string, unknown>;
      const drSummary = (dr.summary as Record<string, string>) ?? {};
      const wrSummary = (wr.summary as Record<string, string>) ?? {};

      const period = (toolArgs.period as string) ?? "Current Period";

      const update = {
        title: `Leadership Update — ${period}`,
        generatedAt: new Date().toISOString(),
        sections: {
          executiveSummary: {
            pipelineHealth: drSummary.totalPipelineValue ?? "N/A",
            weightedPipeline: drSummary.weightedPipelineValue ?? "N/A",
            activeDeals: drSummary.totalDeals ?? "N/A",
            conversionRate: drSummary.conversionRate ?? "N/A",
            revenueExecuted: wrSummary.totalBilled ?? "N/A",
            revenueCollected: wrSummary.totalCollected ?? "N/A",
            collectionRate: wrSummary.collectionRate ?? "N/A",
            outstandingAR: wrSummary.totalReceivable ?? "N/A",
          },
          pipelineHighlights: {
            wonDeals: drSummary.wonDeals ?? "N/A",
            avgDealValue: drSummary.avgDealValue ?? "N/A",
            avgProbability: drSummary.avgClosureProbability ?? "N/A",
            topSectors: (dr.topSectors as Array<{ sector: string; totalValue: string }> ?? []).slice(0, 3),
          },
          operationalHighlights: {
            totalWorkOrders: wrSummary.totalWorkOrders ?? "N/A",
            completionRate: wrSummary.completionRate ?? "N/A",
            overdueAR: wrSummary.overdueReceivables ?? "N/A",
            topCustomers: (wr.topCustomers as Array<{ code: string; billed: string }> ?? []).slice(0, 3),
          },
          dataQuality: {
            dealsCompleteness: drSummary.dataCompleteness ?? "N/A",
            boardsScanned: 2,
          },
        },
        metadata: {
          type: "leadership_update",
          hasData: true,
          data: { deals: dr, workOrders: wr },
        },
      };

      return update;
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
