"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Board {
  id: string;
  name: string;
  description: string | null;
  columnCount: number;
  cached: boolean;
  cachedAt: string | null;
  itemCount: number | null;
  boardType: string | null;
}

export default function BoardStatus() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBoards = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/boards");
      const data = await res.json() as { boards?: Board[]; error?: string };
      if (data.error) throw new Error(data.error);
      setBoards(data.boards ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch boards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchBoards();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-4 skeleton rounded w-32 mb-3" />
        <div className="space-y-2">
          <div className="h-8 skeleton rounded-lg" />
          <div className="h-8 skeleton rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <AlertCircle size={14} />
          <span className="text-xs font-medium">Monday.com Connection Failed</span>
        </div>
        <p className="text-[10px] text-[--text-muted] mb-3 leading-relaxed">{error}</p>
        <div className="text-[10px] text-[--text-muted] space-y-1">
          <p>Check MONDAY_API_KEY in environment variables</p>
        </div>
        <button
          onClick={() => void fetchBoards()}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[--text-muted] hover:text-[--text-secondary] transition-colors"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database size={13} className="text-indigo-400" />
          <span className="text-xs font-semibold text-[--text-primary]">Data Sources</span>
        </div>
        <button
          onClick={() => void fetchBoards()}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-[--text-muted] hover:text-[--text-secondary] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {boards.length === 0 ? (
        <p className="text-[10px] text-[--text-muted]">No boards found</p>
      ) : (
        <div className="space-y-2">
          {boards.map((board) => (
            <div
              key={board.id}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-white/3 border border-white/5"
            >
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-[--text-primary] truncate">{board.name}</p>
                  {board.boardType && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                      board.boardType === "deals" 
                        ? "bg-indigo-500/15 text-indigo-400"
                        : "bg-emerald-500/15 text-emerald-400"
                    )}>
                      {board.boardType === "deals" ? "Deals" : "Work Orders"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[--text-muted]">
                    {board.columnCount} cols
                    {board.itemCount !== null ? ` · ${board.itemCount} items` : ""}
                  </span>
                </div>
              </div>
              <a
                href={`https://monday.com/boards/${board.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[--text-muted] hover:text-indigo-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-[--border-subtle]">
        <div className="flex items-center gap-1.5">
          <span className="status-dot green" />
          <span className="text-[10px] text-[--text-muted]">
            Connected · Live data · 5-min cache
          </span>
        </div>
      </div>
    </div>
  );
}
