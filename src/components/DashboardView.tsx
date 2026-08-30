"use client";

import React, { useEffect, useState } from "react";
import { LayoutDashboard, TrendingUp, DollarSign, Activity, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardData {
  deals: {
    summary: {
      totalDeals: number;
      totalPipelineValue: string;
      wonDeals: string;
      conversionRate: string;
    };
    topSectors: Array<{ sector: string; dealCount: number; totalValue: string }>;
  };
  workOrders: {
    summary: {
      totalWorkOrders: number;
      totalBilled: string;
      totalCollected: string;
      completionRate: string;
    };
    executionStatusBreakdown: Array<{ status: string; count: number; percentage: string }>;
  };
}

const COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#60a5fa"];

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[--bg-subtle]">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-4" />
        <p className="text-[--text-muted]">Aggregating live business metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 bg-[--bg-subtle]">
        Error loading dashboard: {error}
      </div>
    );
  }

  // Transform data for charts
  const parseCurrencyStr = (str: string) => {
    return Number(str.replace(/[^0-9.-]+/g, ""));
  };

  const sectorChartData = (data.deals.topSectors || []).map((s) => ({
    name: s.sector,
    value: parseCurrencyStr(s.totalValue),
  }));

  const statusChartData = (data.workOrders.executionStatusBreakdown || []).map((s) => ({
    name: s.status,
    value: s.count,
  }));

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex-1 overflow-y-auto bg-[--bg-subtle]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-3">
            <LayoutDashboard className="text-indigo-400" size={28} />
            Executive Dashboard
          </h1>
          <p className="text-[--text-muted] mt-2">
            Real-time insights across your sales pipeline and operations.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            title="Total Pipeline"
            value={data.deals.summary.totalPipelineValue}
            icon={<TrendingUp size={20} />}
            color="text-indigo-400"
            bg="bg-indigo-500/10"
          />
          <KpiCard
            title="Revenue Billed"
            value={data.workOrders.summary.totalBilled}
            icon={<DollarSign size={20} />}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <KpiCard
            title="Conversion Rate"
            value={data.deals.summary.conversionRate}
            icon={<Activity size={20} />}
            color="text-amber-400"
            bg="bg-amber-500/10"
          />
          <KpiCard
            title="Total Work Orders"
            value={data.workOrders.summary.totalWorkOrders.toString()}
            icon={<LayoutDashboard size={20} />}
            color="text-violet-400"
            bg="bg-violet-500/10"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-5 rounded-xl border border-[--border-subtle]">
            <h3 className="text-lg font-semibold mb-4">Pipeline by Sector</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#ffffff60" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#ffffff60"
                    fontSize={12}
                    tickFormatter={(val) => `$${val / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#ffffff05" }}
                    contentStyle={{ backgroundColor: "#1e1e2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                    formatter={(val: any) => formatCurrency(Number(val))}
                  />
                  <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-5 rounded-xl border border-[--border-subtle]">
            <h3 className="text-lg font-semibold mb-4">Work Order Status</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e1e2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {statusChartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-[--text-muted]">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  color,
  bg,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div className="glass p-5 rounded-xl border border-[--border-subtle] flex items-center gap-4">
      <div className={`${bg} ${color} w-12 h-12 rounded-full flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <p className="text-[--text-muted] text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
