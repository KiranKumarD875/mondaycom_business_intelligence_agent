"use client";

import React, { useEffect, useState } from "react";
import { Database, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface Board {
  id: string;
  name: string;
  description: string | null;
  columnCount: number;
  cached: boolean;
  cachedAt: string | null;
  itemCount: number | null;
  boardType: "deals" | "work_orders" | null;
}

export default function DataSourcesView() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBoards() {
      try {
        const res = await fetch("/api/boards");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setBoards(data.boards || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load boards");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBoards();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-[--bg-subtle]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-3">
            <Database className="text-indigo-400" size={28} />
            Data Sources
          </h1>
          <p className="text-[--text-muted] mt-2">
            Auto-detected Monday.com boards connected to your workspace.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[--text-muted]">
            <RefreshCw className="w-6 h-6 animate-spin mr-3 text-indigo-400" />
            Scanning Monday.com workspace...
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-6 flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Connection Error</h3>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {boards.map((board) => (
              <div
                key={board.id}
                className="glass rounded-xl p-5 border border-[--border-subtle] hover:border-indigo-500/30 transition-colors relative overflow-hidden"
              >
                {board.boardType && (
                  <div className="absolute top-0 right-0 bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg">
                    {board.boardType.replace("_", " ")}
                  </div>
                )}
                
                <h3 className="font-semibold text-[--text-primary] text-lg mb-1 truncate pr-16">
                  {board.name}
                </h3>
                <p className="text-xs text-[--text-muted] mb-4 opacity-80">
                  ID: {board.id}
                </p>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[--text-muted]">Status</span>
                    {board.cached ? (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 size={14} /> Synced
                      </span>
                    ) : (
                      <span className="text-[--text-muted]">Uncached</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[--text-muted]">Records</span>
                    <span className="font-medium">{board.itemCount ?? 0}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[--text-muted]">Columns</span>
                    <span className="font-medium">{board.columnCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
