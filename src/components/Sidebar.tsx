"use client";

import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Database,
  Settings,
  BookOpen,
  X,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Session {
  id: number;
  sessionId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  boardsConnected: number;
  isConnected: boolean;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  boardsConnected,
  isConnected,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDecisionLog, setShowDecisionLog] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "flex flex-col h-full glass border-r border-[--border-subtle] transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[--border-subtle]">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-sm">🧠</span>
              </div>
              <div>
                <span className="text-sm font-bold text-[--text-primary]">BI Agent</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={cn("status-dot", isConnected ? "green" : "red")} />
                  <span className="text-[10px] text-[--text-muted]">
                    {isConnected ? `${boardsConnected} boards` : "Connecting..."}
                  </span>
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-sm">🧠</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5 transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
              "bg-gradient-to-r from-indigo-600/20 to-violet-600/20",
              "border border-indigo-500/25 hover:border-indigo-500/40",
              "text-indigo-400 hover:text-indigo-300 transition-all duration-200",
              "text-sm font-medium",
              collapsed ? "justify-center px-2" : ""
            )}
          >
            <Plus size={16} className="flex-shrink-0" />
            {!collapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Navigation */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <div className="space-y-0.5">
              <NavItem icon={<LayoutDashboard size={14} />} label="Dashboard" active={false} />
              <NavItem icon={<Database size={14} />} label="Data Sources" active={false} />
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {!collapsed && sessions.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[--text-muted] px-2 py-2 font-semibold">
                Recent Chats
              </p>
              <div className="space-y-0.5">
                {sessions.map((session) => (
                  <SessionItem
                    key={session.sessionId}
                    session={session}
                    isActive={session.sessionId === currentSessionId}
                    onSelect={() => onSelectSession(session.sessionId)}
                    onDelete={() => onDeleteSession(session.sessionId)}
                  />
                ))}
              </div>
            </div>
          )}
          {collapsed && (
            <div className="space-y-2 pt-2">
              {sessions.slice(0, 5).map((session) => (
                <button
                  key={session.sessionId}
                  onClick={() => onSelectSession(session.sessionId)}
                  className={cn(
                    "w-full flex justify-center p-2 rounded-lg transition-colors",
                    session.sessionId === currentSessionId
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5"
                  )}
                >
                  <MessageSquare size={15} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[--border-subtle] space-y-0.5">
          {!collapsed ? (
            <>
              <button
                onClick={() => setShowDecisionLog(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5 transition-colors text-xs"
              >
                <BookOpen size={13} />
                <span>Decision Log</span>
              </button>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5 transition-colors text-xs">
                <Settings size={13} />
                <span>Settings</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowDecisionLog(true)}
                className="w-full flex justify-center p-2 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5 transition-colors"
              >
                <BookOpen size={14} />
              </button>
              <button className="w-full flex justify-center p-2 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5 transition-colors">
                <Settings size={14} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Decision Log Modal */}
      {showDecisionLog && (
        <DecisionLogModal onClose={() => setShowDecisionLog(false)} />
      )}
    </>
  );
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs",
        active
          ? "bg-indigo-500/15 text-indigo-400"
          : "text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150",
        isActive
          ? "bg-indigo-500/15 border border-indigo-500/20"
          : "hover:bg-white/5 border border-transparent"
      )}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      onClick={onSelect}
    >
      <MessageSquare
        size={13}
        className={cn(
          "flex-shrink-0",
          isActive ? "text-indigo-400" : "text-[--text-muted]"
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs truncate",
            isActive ? "text-[--text-primary]" : "text-[--text-secondary]"
          )}
        >
          {session.title ?? "New conversation"}
        </p>
        <p className="text-[10px] text-[--text-muted]">
          {formatRelativeTime(session.updatedAt)}
        </p>
      </div>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:text-red-400 text-[--text-muted] transition-colors"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

function DecisionLogModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-[--border-subtle] bg-[--surface-2]/90 backdrop-blur-sm rounded-t-2xl">
          <h2 className="text-lg font-bold gradient-text">Decision Log</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-[--text-muted] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-6 text-sm">
          <Section title="Key Assumptions">
            <ul className="space-y-2 text-[--text-muted]">
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">1.</span> Two Monday.com boards represent the full data universe: Deals (pipeline) and Work Orders (execution). Auto-detected by board name keywords.</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">2.</span> Data is messy — normalization handles inconsistent dates (10+ formats), currency (₹, commas), nulls, and naming variations gracefully.</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">3.</span> Founders ask non-technical questions — the AI agent interprets intent, not just keywords.</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">4.</span> Indian number formatting (Lakhs/Crores) is appropriate given the dataset context.</li>
            </ul>
          </Section>
          <Section title="Trade-offs & Decisions">
            <ul className="space-y-2 text-[--text-muted]">
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> <strong className="text-white">GPT-4o via tool calling</strong> — Best reasoning for messy data interpretation over smaller models. Trade-off: higher cost, but founder-level BI requires accuracy.</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> <strong className="text-white">5-min board cache</strong> — Reduces API calls while keeping data fresh. Trade-off: slight staleness vs. Monday.com rate limits.</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> <strong className="text-white">Server-side analytics</strong> — All computation happens server-side to keep Monday.com tokens secure.</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> <strong className="text-white">Read-only API</strong> — Strictly no mutations to Monday.com data as specified.</li>
            </ul>
          </Section>
          <Section title="Leadership Updates Interpretation">
            <p className="text-[--text-muted] leading-relaxed">
              Interpreted as structured, board-ready summaries combining: (1) Pipeline health with weighted deal values, (2) Revenue execution metrics with collection rates, (3) Sector performance comparison, (4) Key risks and AR priority accounts, (5) Data quality caveats. Triggered via the <code className="text-indigo-300 bg-indigo-500/10 px-1 rounded text-xs">generate_leadership_update</code> tool or by asking "prepare a leadership update."
            </p>
          </Section>
          <Section title="What I&apos;d Do Differently With More Time">
            <ul className="space-y-2 text-[--text-muted]">
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> Add streaming responses for real-time AI output</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> Interactive data visualizations (bar charts, trend lines) rendered in chat</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> Export leadership reports to PDF/slides</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> Monday.com webhooks for real-time data updates</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> User authentication and multi-tenant sessions</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> Voice input for truly hands-free founder queries</li>
              <li className="flex gap-2"><span className="text-indigo-400 flex-shrink-0">▸</span> Fine-tuned embeddings for semantic board search across unlimited boards</li>
            </ul>
          </Section>
          <Section title="Tech Stack">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Framework", "Next.js 16 (App Router)"],
                ["AI", "OpenAI GPT-4o + Tool Calling"],
                ["Database", "PostgreSQL + Drizzle ORM"],
                ["Styling", "Tailwind CSS 4"],
                ["Monday.com", "REST/GraphQL API v2"],
                ["Deployment", "Fullstack (Node.js)"],
              ].map(([k, v]) => (
                <div key={k} className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-[10px] text-[--text-muted] uppercase tracking-wide">{k}</p>
                  <p className="text-xs text-[--text-primary] font-medium mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full" />
        {title}
      </h3>
      {children}
    </div>
  );
}
