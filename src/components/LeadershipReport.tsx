"use client";

import { TrendingUp, DollarSign, BarChart3, Target, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportSection {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}

interface LeadershipReportData {
  title: string;
  generatedAt: string;
  sections: {
    executiveSummary: Record<string, string>;
    pipelineHighlights: Record<string, unknown>;
    operationalHighlights: Record<string, unknown>;
  };
}

interface LeadershipReportProps {
  data: LeadershipReportData;
}

export default function LeadershipReport({ data }: LeadershipReportProps) {
  const { sections } = data;
  const exec = sections.executiveSummary;

  const pipelineMetrics: ReportSection[] = [
    { label: "Total Pipeline", value: exec.pipelineHealth ?? "N/A", icon: <TrendingUp size={14} />, color: "indigo" },
    { label: "Weighted Pipeline", value: exec.weightedPipeline ?? "N/A", icon: <Target size={14} />, color: "violet" },
    { label: "Active Deals", value: exec.activeDeals ?? "N/A", icon: <Users size={14} />, color: "cyan" },
    { label: "Conversion Rate", value: exec.conversionRate ?? "N/A", icon: <CheckCircle2 size={14} />, color: "emerald" },
  ];

  const revenueMetrics: ReportSection[] = [
    { label: "Revenue Executed", value: exec.revenueExecuted ?? "N/A", icon: <DollarSign size={14} />, color: "emerald" },
    { label: "Revenue Collected", value: exec.revenueCollected ?? "N/A", icon: <BarChart3 size={14} />, color: "emerald" },
    { label: "Collection Rate", value: exec.collectionRate ?? "N/A", icon: <Target size={14} />, color: "amber" },
    { label: "Outstanding AR", value: exec.outstandingAR ?? "N/A", icon: <AlertTriangle size={14} />, color: "rose" },
  ];

  return (
    <div className="mt-4 border border-indigo-500/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/20 to-violet-600/10 px-4 py-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white">{data.title}</h3>
        </div>
        <p className="text-[11px] text-[--text-muted] mt-0.5">
          Generated {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="p-4 space-y-5">
        {/* Pipeline */}
        <div>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2.5">
            📊 Pipeline Health
          </p>
          <div className="grid grid-cols-2 gap-2">
            {pipelineMetrics.map((m) => (
              <MetricBlock key={m.label} metric={m} />
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2.5">
            💰 Revenue Performance
          </p>
          <div className="grid grid-cols-2 gap-2">
            {revenueMetrics.map((m) => (
              <MetricBlock key={m.label} metric={m} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[--border-subtle] flex items-center justify-between">
          <p className="text-[10px] text-[--text-muted]">
            Data sourced live from Monday.com
          </p>
          <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">
            Confidential
          </span>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ metric }: { metric: ReportSection }) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    indigo: { bg: "bg-indigo-500/10", text: "text-indigo-300", icon: "text-indigo-400" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-300", icon: "text-violet-400" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-300", icon: "text-cyan-400" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-300", icon: "text-emerald-400" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-300", icon: "text-amber-400" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-300", icon: "text-rose-400" },
  };

  const colors = colorMap[metric.color ?? "indigo"];

  return (
    <div className={cn("rounded-lg p-3 border border-white/5", colors.bg)}>
      <div className={cn("mb-1.5", colors.icon)}>{metric.icon}</div>
      <p className={cn("text-sm font-bold", colors.text)}>{metric.value}</p>
      <p className="text-[10px] text-[--text-muted] mt-0.5">{metric.label}</p>
    </div>
  );
}
