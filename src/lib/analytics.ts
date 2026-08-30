/**
 * Business Intelligence Analytics Engine
 * Computes metrics from normalized deal and work order data
 */

import type { NormalizedDeal, NormalizedWorkOrder } from "./data-normalizer";

export interface PipelineMetrics {
  totalDeals: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  dealsByStage: Record<string, { count: number; value: number }>;
  dealsByStatus: Record<string, { count: number; value: number }>;
  dealsBySector: Record<string, { count: number; value: number }>;
  dealsByOwner: Record<string, { count: number; value: number }>;
  wonDeals: { count: number; value: number };
  lostDeals: { count: number; value: number };
  conversionRate: number;
  avgDealValue: number;
  avgClosureProbability: number;
  dataQuality: {
    missingValues: number;
    totalFields: number;
    completenessPercent: number;
  };
}

export interface RevenueMetrics {
  totalBilled: number;
  totalCollected: number;
  totalReceivable: number;
  collectionRate: number;
  avgCollectionPerWO: number;
  byStatus: Record<string, { count: number; billed: number; collected: number }>;
  bySector: Record<string, { count: number; billed: number; collected: number }>;
  byTypeOfWork: Record<string, { count: number; billed: number; collected: number }>;
  topCustomers: Array<{ code: string; billed: number; collected: number; count: number }>;
  monthlyBilling: Record<string, number>;
  monthlyCollection: Record<string, number>;
  overdueReceivables: { count: number; amount: number };
}

export interface OperationalMetrics {
  totalWorkOrders: number;
  byExecutionStatus: Record<string, number>;
  bySector: Record<string, number>;
  byTypeOfWork: Record<string, number>;
  completionRate: number;
  avgProjectDuration: number | null;
  arPriorityBreakdown: Record<string, number>;
  invoiceStatusBreakdown: Record<string, number>;
  billingStatusBreakdown: Record<string, number>;
}

function safeSum(arr: (number | null)[]): number {
  return arr.reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

function groupBy<T>(
  items: T[],
  key: (item: T) => string | null
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item) ?? "Unknown";
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

export function computePipelineMetrics(deals: NormalizedDeal[]): PipelineMetrics {
  const totalDeals = deals.length;
  const totalPipelineValue = safeSum(deals.map((d) => d.dealValue));
  
  // Weighted by closure probability
  const weightedPipelineValue = deals.reduce((sum, d) => {
    const prob = (d.closureProbability ?? 50) / 100;
    return sum + (d.dealValue ?? 0) * prob;
  }, 0);

  // By stage
  const stageGroups = groupBy(deals, (d) => d.dealStage);
  const dealsByStage: Record<string, { count: number; value: number }> = {};
  for (const [stage, items] of Object.entries(stageGroups)) {
    dealsByStage[stage] = {
      count: items.length,
      value: safeSum(items.map((d) => d.dealValue)),
    };
  }

  // By status
  const statusGroups = groupBy(deals, (d) => d.status);
  const dealsByStatus: Record<string, { count: number; value: number }> = {};
  for (const [status, items] of Object.entries(statusGroups)) {
    dealsByStatus[status] = {
      count: items.length,
      value: safeSum(items.map((d) => d.dealValue)),
    };
  }

  // By sector
  const sectorGroups = groupBy(deals, (d) => d.sector);
  const dealsBySector: Record<string, { count: number; value: number }> = {};
  for (const [sector, items] of Object.entries(sectorGroups)) {
    dealsBySector[sector] = {
      count: items.length,
      value: safeSum(items.map((d) => d.dealValue)),
    };
  }

  // By owner
  const ownerGroups = groupBy(deals, (d) => d.ownerCode);
  const dealsByOwner: Record<string, { count: number; value: number }> = {};
  for (const [owner, items] of Object.entries(ownerGroups)) {
    dealsByOwner[owner] = {
      count: items.length,
      value: safeSum(items.map((d) => d.dealValue)),
    };
  }

  const wonDealsArr = deals.filter(
    (d) => d.status?.toLowerCase().includes("won") || d.status?.toLowerCase().includes("closed")
  );
  const lostDealsArr = deals.filter((d) => d.status?.toLowerCase().includes("lost"));

  const wonDeals = {
    count: wonDealsArr.length,
    value: safeSum(wonDealsArr.map((d) => d.dealValue)),
  };
  const lostDeals = {
    count: lostDealsArr.length,
    value: safeSum(lostDealsArr.map((d) => d.dealValue)),
  };

  const closedDeals = wonDeals.count + lostDeals.count;
  const conversionRate = closedDeals > 0 ? (wonDeals.count / closedDeals) * 100 : 0;

  const dealsWithValue = deals.filter((d) => d.dealValue !== null);
  const avgDealValue = dealsWithValue.length > 0 ? safeSum(dealsWithValue.map((d) => d.dealValue)) / dealsWithValue.length : 0;

  const dealsWithProb = deals.filter((d) => d.closureProbability !== null);
  const avgClosureProbability =
    dealsWithProb.length > 0
      ? dealsWithProb.reduce((s, d) => s + (d.closureProbability ?? 0), 0) / dealsWithProb.length
      : 0;

  const totalFields = deals.length * 8; // 8 key fields
  const missingValues = deals.reduce((sum, d) => sum + d.dataQuality.missingFields.length, 0);

  return {
    totalDeals,
    totalPipelineValue,
    weightedPipelineValue,
    dealsByStage,
    dealsByStatus,
    dealsBySector,
    dealsByOwner,
    wonDeals,
    lostDeals,
    conversionRate,
    avgDealValue,
    avgClosureProbability,
    dataQuality: {
      missingValues,
      totalFields,
      completenessPercent: Math.round(((totalFields - missingValues) / totalFields) * 100),
    },
  };
}

export function computeRevenueMetrics(workOrders: NormalizedWorkOrder[]): RevenueMetrics {
  const totalBilled = safeSum(workOrders.map((w) => w.billedValueIncGst));
  const totalCollected = safeSum(workOrders.map((w) => w.collectionAmount));
  const totalReceivable = safeSum(workOrders.map((w) => w.amountReceivable));

  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
  const avgCollectionPerWO = workOrders.length > 0 ? totalCollected / workOrders.length : 0;

  // By status
  const statusGroups = groupBy(workOrders, (w) => w.executionStatus);
  const byStatus: Record<string, { count: number; billed: number; collected: number }> = {};
  for (const [status, items] of Object.entries(statusGroups)) {
    byStatus[status] = {
      count: items.length,
      billed: safeSum(items.map((w) => w.billedValueIncGst)),
      collected: safeSum(items.map((w) => w.collectionAmount)),
    };
  }

  // By sector
  const sectorGroups = groupBy(workOrders, (w) => w.sector);
  const bySector: Record<string, { count: number; billed: number; collected: number }> = {};
  for (const [sector, items] of Object.entries(sectorGroups)) {
    bySector[sector] = {
      count: items.length,
      billed: safeSum(items.map((w) => w.billedValueIncGst)),
      collected: safeSum(items.map((w) => w.collectionAmount)),
    };
  }

  // By type of work
  const workTypeGroups = groupBy(workOrders, (w) => w.typeOfWork);
  const byTypeOfWork: Record<string, { count: number; billed: number; collected: number }> = {};
  for (const [type, items] of Object.entries(workTypeGroups)) {
    byTypeOfWork[type] = {
      count: items.length,
      billed: safeSum(items.map((w) => w.billedValueIncGst)),
      collected: safeSum(items.map((w) => w.collectionAmount)),
    };
  }

  // Top customers
  const customerGroups = groupBy(workOrders, (w) => w.customerCode);
  const topCustomers = Object.entries(customerGroups)
    .map(([code, items]) => ({
      code,
      billed: safeSum(items.map((w) => w.billedValueIncGst)),
      collected: safeSum(items.map((w) => w.collectionAmount)),
      count: items.length,
    }))
    .sort((a, b) => b.billed - a.billed)
    .slice(0, 10);

  // Monthly billing
  const monthlyBilling: Record<string, number> = {};
  const monthlyCollection: Record<string, number> = {};

  for (const wo of workOrders) {
    if (wo.actualBillingMonth) {
      const month = wo.actualBillingMonth.substring(0, 7); // YYYY-MM
      monthlyBilling[month] = (monthlyBilling[month] ?? 0) + (wo.billedValueIncGst ?? 0);
    }
    if (wo.actualCollectionMonth) {
      const month = wo.actualCollectionMonth.substring(0, 7);
      monthlyCollection[month] = (monthlyCollection[month] ?? 0) + (wo.collectionAmount ?? 0);
    }
  }

  // Overdue receivables (high AR priority with receivable amount)
  const overdueWOs = workOrders.filter(
    (w) => w.amountReceivable !== null && w.amountReceivable > 0 && w.arPriority
  );
  const overdueReceivables = {
    count: overdueWOs.length,
    amount: safeSum(overdueWOs.map((w) => w.amountReceivable)),
  };

  return {
    totalBilled,
    totalCollected,
    totalReceivable,
    collectionRate,
    avgCollectionPerWO,
    byStatus,
    bySector,
    byTypeOfWork,
    topCustomers,
    monthlyBilling,
    monthlyCollection,
    overdueReceivables,
  };
}

export function computeOperationalMetrics(workOrders: NormalizedWorkOrder[]): OperationalMetrics {
  const totalWorkOrders = workOrders.length;

  const byExecutionStatus: Record<string, number> = {};
  const bySector: Record<string, number> = {};
  const byTypeOfWork: Record<string, number> = {};
  const arPriorityBreakdown: Record<string, number> = {};
  const invoiceStatusBreakdown: Record<string, number> = {};
  const billingStatusBreakdown: Record<string, number> = {};

  for (const wo of workOrders) {
    const status = wo.executionStatus ?? "Unknown";
    byExecutionStatus[status] = (byExecutionStatus[status] ?? 0) + 1;

    const sector = wo.sector ?? "Unknown";
    bySector[sector] = (bySector[sector] ?? 0) + 1;

    const type = wo.typeOfWork ?? "Unknown";
    byTypeOfWork[type] = (byTypeOfWork[type] ?? 0) + 1;

    if (wo.arPriority) {
      arPriorityBreakdown[wo.arPriority] = (arPriorityBreakdown[wo.arPriority] ?? 0) + 1;
    }

    if (wo.invoiceStatus) {
      invoiceStatusBreakdown[wo.invoiceStatus] = (invoiceStatusBreakdown[wo.invoiceStatus] ?? 0) + 1;
    }

    if (wo.billingStatus) {
      billingStatusBreakdown[wo.billingStatus] = (billingStatusBreakdown[wo.billingStatus] ?? 0) + 1;
    }
  }

  const completedCount =
    (byExecutionStatus["Completed"] ?? 0) +
    (byExecutionStatus["Delivered"] ?? 0) +
    (byExecutionStatus["Billed"] ?? 0) +
    (byExecutionStatus["Collected"] ?? 0);

  const completionRate = totalWorkOrders > 0 ? (completedCount / totalWorkOrders) * 100 : 0;

  // Average project duration
  const durations: number[] = [];
  for (const wo of workOrders) {
    if (wo.probableStartDate && wo.probableEndDate) {
      const start = new Date(wo.probableStartDate).getTime();
      const end = new Date(wo.probableEndDate).getTime();
      const days = (end - start) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 3650) durations.push(days);
    }
  }
  const avgProjectDuration =
    durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : null;

  return {
    totalWorkOrders,
    byExecutionStatus,
    bySector,
    byTypeOfWork,
    completionRate,
    avgProjectDuration,
    arPriorityBreakdown,
    invoiceStatusBreakdown,
    billingStatusBreakdown,
  };
}

/**
 * Format large numbers for display
 */
export function formatCurrency(value: number, currency = "₹"): string {
  if (value >= 1_00_00_000) return `${currency}${(value / 1_00_00_000).toFixed(2)}Cr`;
  if (value >= 1_00_000) return `${currency}${(value / 1_00_000).toFixed(2)}L`;
  if (value >= 1_000) return `${currency}${(value / 1_000).toFixed(1)}K`;
  return `${currency}${value.toFixed(0)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(2)}Cr`;
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(2)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value.toFixed(0)}`;
}
