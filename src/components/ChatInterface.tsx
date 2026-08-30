"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { generateSessionId } from "@/lib/utils";
import ChatMessage, { type Message } from "./ChatMessage";
import ChatInput from "./ChatInput";
import SuggestedQueries from "./SuggestedQueries";
import Sidebar from "./Sidebar";
import BoardStatus from "./BoardStatus";
import { BarChart3, ChevronRight, Settings } from "lucide-react";
import ConfigModal from "./ConfigModal";
import SetupGuide from "./SetupGuide";
import DashboardView from "./DashboardView";
import DataSourcesView from "./DataSourcesView";

interface Session {
  id: number;
  sessionId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  message?: string;
  error?: string;
  toolsUsed?: string[];
  metadata?: {
    type?: string;
    hasData?: boolean;
  };
}

interface HistoryItem {
  id: number;
  role: string;
  content: string;
  metadata?: {
    type?: string;
    hasData?: boolean;
  } | null;
  createdAt: string;
}

export default function ChatInterface() {
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [boardsConnected, setBoardsConnected] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [hasOpenAI, setHasOpenAI] = useState(false);
  const [hasMonday, setHasMonday] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [activeView, setActiveView] = useState<"chat" | "dashboard" | "data_sources">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json() as { sessions?: Session[] };
      setSessions(data.sessions ?? []);
    } catch {
      // silently fail
    }
  }, []);

  // Check boards connectivity
  const checkConnectivity = useCallback(async () => {
    try {
      // Check health endpoint for API key status
      const healthRes = await fetch("/api/health");
      const health = await healthRes.json() as { monday?: boolean; openai?: boolean };
      setHasOpenAI(!!health.openai);
      setHasMonday(!!health.monday);

      if (!health.monday || !health.openai) {
        setShowSetup(true);
      }

      if (health.monday) {
        const res = await fetch("/api/boards");
        const data = await res.json() as { boards?: { id: string }[]; error?: string };
        if (!data.error && data.boards) {
          setBoardsConnected(data.boards.length);
          setIsConnected(true);
        }
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    void checkConnectivity();
  }, [loadSessions, checkConnectivity]);

  // Load conversation history for a session
  const loadHistory = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/chat?sessionId=${sid}`);
      const data = await res.json() as { history?: HistoryItem[] };
      if (data.history && data.history.length > 0) {
        const msgs: Message[] = data.history.map((h) => ({
          id: String(h.id),
          role: h.role as "user" | "assistant",
          content: h.content,
          metadata: h.metadata ?? undefined,
          createdAt: new Date(h.createdAt),
        }));
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, []);

  // Select a session
  const handleSelectSession = useCallback(
    async (sid: string) => {
      setSessionId(sid);
      await loadHistory(sid);
    },
    [loadHistory]
  );

  // New chat
  const handleNewChat = useCallback(() => {
    const newId = generateSessionId();
    setSessionId(newId);
    setMessages([]);
    void loadSessions();
  }, [loadSessions]);

  // Delete session
  const handleDeleteSession = useCallback(
    async (sid: string) => {
      try {
        await fetch(`/api/sessions?sessionId=${sid}`, { method: "DELETE" });
        await loadSessions();
        if (sid === sessionId) {
          handleNewChat();
        }
      } catch {
        // silently fail
      }
    },
    [loadSessions, sessionId, handleNewChat]
  );

  // Send message
  const handleSend = useCallback(
    async (userMessage: string) => {
      if (isLoading) return;

      const userMsg: Message = {
        id: `user_${Date.now()}`,
        role: "user",
        content: userMessage,
        createdAt: new Date(),
      };

      const loadingMsg: Message = {
        id: `loading_${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage, sessionId }),
        });

        const data = await res.json() as ApiResponse;

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to get response");
        }

        const assistantMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: data.message ?? "I encountered an issue processing your request.",
          toolsUsed: data.toolsUsed,
          metadata: data.metadata,
          createdAt: new Date(),
        };

        setMessages((prev) => [
          ...prev.filter((m) => !m.isStreaming),
          assistantMsg,
        ]);

        // Refresh sessions list
        await loadSessions();
      } catch (error) {
        const errorMsg: Message = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: `I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please check your Monday.com API key and board configuration.`,
          createdAt: new Date(),
        };

        setMessages((prev) => [
          ...prev.filter((m) => !m.isStreaming),
          errorMsg,
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, loadSessions]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        boardsConnected={boardsConnected}
        isConnected={isConnected}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-[--border-subtle] glass">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-400" />
              <span className="text-sm font-semibold text-[--text-primary]">
                Monday.com BI Agent
              </span>
            </div>
            {isConnected && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="status-dot green" />
                <span className="text-[10px] text-emerald-400 font-medium">
                  {boardsConnected} board{boardsConnected !== 1 ? "s" : ""} connected
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5 transition-colors"
              title="Configuration"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Setup</span>
            </button>
            <button
              onClick={() => setShowRightPanel((v) => !v)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] hover:bg-white/5 transition-colors"
            >
              <span>{showRightPanel ? "Hide" : "Show"} Panel</span>
              <ChevronRight
                size={12}
                style={{ transform: showRightPanel ? "rotate(0deg)" : "rotate(180deg)" }}
              />
            </button>
          </div>
        </header>

        {/* Content area */}
        {activeView === "dashboard" && <DashboardView />}
        {activeView === "data_sources" && <DataSourcesView />}
        {activeView === "chat" && (
          <div className="flex-1 flex overflow-hidden">
          {/* Chat column */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-6"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                {!hasMessages ? (
                  showSetup ? (
                    <SetupGuide
                      hasOpenAI={hasOpenAI}
                      hasMonday={hasMonday}
                      onDismiss={() => setShowSetup(false)}
                    />
                  ) : (
                    <SuggestedQueries onSelect={handleSend} />
                  )
                ) : (
                  <>
                    {messages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="px-4 pb-5 pt-3 border-t border-[--border-subtle]">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSend={handleSend}
                  isLoading={isLoading}
                  disabled={false}
                />
                <p className="text-center text-[10px] text-[--text-muted] mt-2">
                  AI can make mistakes. Verify critical business decisions with source data.
                </p>
              </div>
            </div>
          </div>

          {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}

        {/* Right panel */}
          {showRightPanel && (
            <aside className="hidden lg:flex flex-col w-72 border-l border-[--border-subtle] overflow-y-auto p-4 gap-4">
              <BoardStatus />
              <QuickStats />
              <QuickGuide onSelectQuery={handleSend} />
            </aside>
          )}
        </div>
        )}
      </main>
    </div>
  );
}

function QuickStats() {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs font-semibold text-[--text-primary] mb-3">Agent Capabilities</p>
      <div className="space-y-2">
        {[
          { label: "Pipeline Analysis", desc: "Deal stages, values, sectors" },
          { label: "Revenue Intelligence", desc: "Billing, collections, AR" },
          { label: "Team Performance", desc: "Owner & KAM metrics" },
          { label: "Risk Identification", desc: "Stalled deals & overdue AR" },
          { label: "Leadership Reports", desc: "Board-ready summaries" },
          { label: "Cross-Board Analysis", desc: "Pipeline vs execution" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[--text-primary] font-medium">{item.label}</p>
              <p className="text-[10px] text-[--text-muted]">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickGuide({ onSelectQuery }: { onSelectQuery: (q: string) => void }) {
  const queries = [
    "Show pipeline by sector",
    "What's our collection rate?",
    "Top 5 deals by value",
    "Energy sector work orders",
    "Generate leadership update",
    "Who are our top customers?",
  ];

  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs font-semibold text-[--text-primary] mb-3">Quick Queries</p>
      <div className="space-y-1">
        {queries.map((q) => (
          <button
            key={q}
            onClick={() => onSelectQuery(q)}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-[--text-muted] hover:text-[--text-primary] hover:bg-white/5 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
