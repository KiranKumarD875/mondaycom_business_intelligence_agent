"use client";

import React from "react";
import { TrendingUp, DollarSign, Users, BarChart2, FileSearch, Zap } from "lucide-react";

interface SuggestedQuery {
  icon: React.ReactNode;
  label: string;
  query: string;
  category: string;
}

const SUGGESTED_QUERIES: SuggestedQuery[] = [
  {
    icon: <TrendingUp size={16} className="text-indigo-400" />,
    label: "Pipeline Overview",
    query: "How's our overall pipeline looking? Give me a complete breakdown by stage and sector.",
    category: "Pipeline",
  },
  {
    icon: <BarChart2 size={16} className="text-cyan-400" />,
    label: "Energy Sector",
    query: "What's our pipeline and execution status in the energy sector this quarter?",
    category: "Sector",
  },
  {
    icon: <DollarSign size={16} className="text-emerald-400" />,
    label: "Revenue Health",
    query: "What's our total billed vs collected? Show collection rates and outstanding AR.",
    category: "Revenue",
  },
  {
    icon: <Users size={16} className="text-violet-400" />,
    label: "Team Performance",
    query: "Which BD/KAM personnel are driving the most deals and revenue?",
    category: "People",
  },
  {
    icon: <FileSearch size={16} className="text-amber-400" />,
    label: "Leadership Update",
    query: "Generate a comprehensive leadership update for this quarter covering pipeline, revenue, and operations.",
    category: "Reports",
  },
  {
    icon: <Zap size={16} className="text-rose-400" />,
    label: "Risk Analysis",
    query: "What are our highest-risk work orders and deals? Highlight collection issues and stalled pipeline.",
    category: "Risk",
  },
];

interface SuggestedQueriesProps {
  onSelect: (query: string) => void;
}

export default function SuggestedQueries({ onSelect }: SuggestedQueriesProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/25 mb-5 animate-float">
          <span className="text-3xl">🧠</span>
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-3">
          Business Intelligence Agent
        </h1>
        <p className="text-[--text-muted] text-base max-w-lg mx-auto leading-relaxed">
          Ask any founder-level question about your Monday.com data — deals, pipeline, revenue, operations, and more.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {["Live Monday.com Data", "AI-Powered Analysis", "Cross-Board Insights", "Data Quality Aware"].map((f) => (
          <span
            key={f}
            className="px-3 py-1 text-xs rounded-full border border-indigo-500/20 text-indigo-400/80 bg-indigo-500/5"
          >
            {f}
          </span>
        ))}
      </div>

      {/* Query cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SUGGESTED_QUERIES.map((sq) => (
          <button
            key={sq.label}
            onClick={() => onSelect(sq.query)}
            className="group hover-card glass rounded-xl p-4 text-left cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-indigo-500/30 transition-colors">
                {sq.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-[--text-primary]">{sq.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[--text-muted]">
                    {sq.category}
                  </span>
                </div>
                <p className="text-xs text-[--text-muted] leading-relaxed line-clamp-2">
                  {sq.query}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-[--text-muted] mt-6">
        Connects live to Monday.com • Never hardcoded data • Always fresh
      </p>
    </div>
  );
}
