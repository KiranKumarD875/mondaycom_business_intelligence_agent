"use client";

import { TrendingUp, TrendingDown, DollarSign, Target, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardData {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  color?: "indigo" | "emerald" | "amber" | "rose" | "cyan" | "violet";
}

interface MetricCardsProps {
  title?: string;
  metrics: MetricCardData[];
}

const colorMap = {
  indigo: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    icon: "text-indigo-400",
    value: "text-indigo-300",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-400",
    value: "text-emerald-300",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "text-amber-400",
    value: "text-amber-300",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: "text-rose-400",
    value: "text-rose-300",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    icon: "text-cyan-400",
    value: "text-cyan-300",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icon: "text-violet-400",
    value: "text-violet-300",
  },
};

function MetricCard({ metric }: { metric: MetricCardData }) {
  const color = colorMap[metric.color ?? "indigo"];

  return (
    <div
      className={cn(
        "metric-card rounded-xl p-3 border hover-card",
        color.border
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", color.bg)}>
          <span className={color.icon}>{metric.icon ?? <DollarSign size={13} />}</span>
        </div>
        {metric.trend && (
          <span
            className={cn(
              "text-[10px] font-medium flex items-center gap-0.5",
              metric.trend === "up" ? "text-emerald-400" : metric.trend === "down" ? "text-rose-400" : "text-slate-400"
            )}
          >
            {metric.trend === "up" ? <TrendingUp size={10} /> : metric.trend === "down" ? <TrendingDown size={10} /> : null}
          </span>
        )}
      </div>
      <p className={cn("text-base font-bold", color.value)}>{metric.value}</p>
      <p className="text-[10px] text-[--text-muted] mt-0.5">{metric.label}</p>
      {metric.subValue && (
        <p className="text-[10px] text-slate-500 mt-0.5">{metric.subValue}</p>
      )}
    </div>
  );
}

export default function MetricCards({ title, metrics }: MetricCardsProps) {
  if (!metrics.length) return null;

  return (
    <div className="mt-3">
      {title && (
        <p className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider mb-2">
          {title}
        </p>
      )}
      <div className={cn(
        "grid gap-2",
        metrics.length <= 2 ? "grid-cols-2" :
        metrics.length <= 3 ? "grid-cols-3" :
        "grid-cols-2 sm:grid-cols-4"
      )}>
        {metrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>
    </div>
  );
}

// Helper to extract key metrics from AI response for display
export function extractKeyMetrics(content: string): MetricCardData[] {
  const metrics: MetricCardData[] = [];

  // Try to extract pipeline value patterns
  const pipelineMatch = content.match(/pipeline.*?[₹$]([0-9.,]+[KLCr]+)/i);
  if (pipelineMatch) {
    metrics.push({
      label: "Total Pipeline",
      value: `₹${pipelineMatch[1]}`,
      icon: <TrendingUp size={13} />,
      color: "indigo",
    });
  }

  // Collection rate
  const collectionMatch = content.match(/collection rate.*?(\d+\.?\d*)%/i);
  if (collectionMatch) {
    const rate = parseFloat(collectionMatch[1]);
    metrics.push({
      label: "Collection Rate",
      value: `${collectionMatch[1]}%`,
      icon: <Target size={13} />,
      color: rate >= 70 ? "emerald" : rate >= 50 ? "amber" : "rose",
      trend: rate >= 70 ? "up" : "down",
    });
  }

  // Deal count
  const dealMatch = content.match(/(\d+)\s+(?:active\s+)?deals?/i);
  if (dealMatch) {
    metrics.push({
      label: "Deals",
      value: dealMatch[1],
      icon: <Users size={13} />,
      color: "violet",
    });
  }

  // Won deals
  const wonMatch = content.match(/(\d+)\s+won\s+deals?/i);
  if (wonMatch) {
    metrics.push({
      label: "Won Deals",
      value: wonMatch[1],
      icon: <TrendingUp size={13} />,
      color: "emerald",
      trend: "up",
    });
  }

  // AR warning
  const arMatch = content.match(/outstanding.*?[₹$]([0-9.,]+[KLCr]+)/i);
  if (arMatch) {
    metrics.push({
      label: "Outstanding AR",
      value: `₹${arMatch[1]}`,
      icon: <AlertTriangle size={13} />,
      color: "amber",
      trend: "down",
    });
  }

  return metrics.slice(0, 4); // max 4 metrics
}
