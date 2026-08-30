"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Bot, User, Sparkles, Database, BarChart3, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import MetricCards, { extractKeyMetrics } from "./MetricCards";
import LeadershipReport from "./LeadershipReport";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  metadata?: {
    type?: string;
    hasData?: boolean;
    data?: unknown;
  };
  createdAt: Date;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

const toolIcons: Record<string, React.ReactNode> = {
  fetch_boards: <Database size={11} />,
  fetch_deals_data: <BarChart3 size={11} />,
  fetch_work_orders_data: <BarChart3 size={11} />,
  cross_board_analysis: <Sparkles size={11} />,
  generate_leadership_update: <FileText size={11} />,
};

const toolLabels: Record<string, string> = {
  fetch_boards: "Boards",
  fetch_deals_data: "Deals",
  fetch_work_orders_data: "Work Orders",
  cross_board_analysis: "Cross Analysis",
  generate_leadership_update: "Leadership Report",
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
      <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
      <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "animate-slide-in flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <User size={15} className="text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Bot size={15} className="text-white" />
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={cn("flex flex-col gap-2 max-w-[82%]", isUser ? "items-end" : "items-start")}>
        {/* Tools used badges */}
        {!isUser && message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(message.toolsUsed)].map((tool) => (
              <span
                key={tool}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                           bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              >
                {toolIcons[tool] ?? <Database size={10} />}
                {toolLabels[tool] ?? tool}
              </span>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 rounded-tr-sm"
              : "glass text-[--text-secondary] rounded-tl-sm"
          )}
        >
          {message.isStreaming ? (
            <TypingIndicator />
          ) : isUser ? (
            <p className="text-white leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-dark">
              <ReactMarkdown
                components={{
                  // Inline code
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                      return (
                        <pre className="bg-black/40 border border-indigo-500/20 rounded-lg p-3 overflow-x-auto my-3">
                          <code className="text-indigo-200 text-xs font-mono">{children}</code>
                        </pre>
                      );
                    }
                    return (
                      <code className="bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    );
                  },
                  // Tables with nice styling
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-indigo-500/15">
                      <table className="w-full text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-indigo-500/10 text-indigo-300 font-semibold px-3 py-2 text-left border-b border-indigo-500/15 whitespace-nowrap">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-b border-white/5 text-slate-300 whitespace-nowrap">
                      {children}
                    </td>
                  ),
                  // Bold text
                  strong: ({ children }) => (
                    <strong className="text-white font-semibold">{children}</strong>
                  ),
                  // Headings
                  h1: ({ children }) => (
                    <h1 className="text-white font-bold text-lg mt-4 mb-2 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-white font-semibold text-base mt-3 mb-1.5 first:mt-0 pb-1 border-b border-white/10">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-indigo-300 font-semibold text-sm mt-2.5 mb-1 first:mt-0">
                      {children}
                    </h3>
                  ),
                  // Lists
                  ul: ({ children }) => (
                    <ul className="space-y-1 my-2 pl-0">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2 text-slate-300 text-sm leading-relaxed">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">▸</span>
                      <span>{children}</span>
                    </li>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-1 my-2 pl-5 list-decimal">{children}</ol>
                  ),
                  // Blockquote
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-indigo-500 pl-3 py-1 my-2 bg-indigo-500/5 rounded-r text-slate-400 italic text-sm">
                      {children}
                    </blockquote>
                  ),
                  // Horizontal rule
                  hr: () => <hr className="border-white/10 my-3" />,
                  // Paragraph
                  p: ({ children }) => (
                    <p className="text-slate-300 leading-relaxed mb-2 last:mb-0 text-sm">
                      {children}
                    </p>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Leadership Report Visualization */}
        {!isUser && !message.isStreaming && message.metadata?.type === "leadership_update" && !!message.metadata.data && (() => {
          try {
            const d = message.metadata.data as { sections?: { executiveSummary?: Record<string, string> } };
            if (d.sections?.executiveSummary) {
              return (
                <LeadershipReport
                  data={{
                    title: "Leadership Update",
                    generatedAt: new Date().toISOString(),
                    sections: d.sections as {
                      executiveSummary: Record<string, string>;
                      pipelineHighlights: Record<string, unknown>;
                      operationalHighlights: Record<string, unknown>;
                    },
                  }}
                />
              ) as React.ReactNode;
            }
          } catch {
            // skip
          }
          return null as React.ReactNode;
        })()}

        {/* Inline metric cards for data-rich responses */}
        {!isUser && !message.isStreaming && message.metadata?.type !== "leadership_update" && message.toolsUsed && message.toolsUsed.length > 0 && (() => {
          const metrics = extractKeyMetrics(message.content);
          if (metrics.length >= 2) {
            return <MetricCards metrics={metrics} />;
          }
          return null;
        })()}

        {/* Data quality warning */}
        {!isUser && message.content.includes("⚠️") && !message.isStreaming && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/70">
            <AlertCircle size={11} />
            <span>Data quality caveat included</span>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-[--text-muted] opacity-0 group-hover:opacity-100 transition-opacity">
          {message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
