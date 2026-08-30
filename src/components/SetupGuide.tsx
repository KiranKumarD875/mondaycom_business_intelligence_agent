"use client";

import { useState } from "react";
import { Key, ExternalLink, ChevronRight, CheckCircle2, AlertCircle, Database, Bot } from "lucide-react";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  link?: { label: string; url: string };
  envVar?: string;
  completed?: boolean;
}

interface SetupGuideProps {
  hasOpenAI: boolean;
  hasMonday: boolean;
  onDismiss?: () => void;
}

export default function SetupGuide({ hasOpenAI, hasMonday, onDismiss }: SetupGuideProps) {
  const [expanded, setExpanded] = useState<string | null>("monday");

  const steps: SetupStep[] = [
    {
      id: "monday",
      title: "Connect Monday.com",
      description: "Get your Monday.com API token to allow the agent to read your boards.",
      link: { label: "Get API Token", url: "https://developer.monday.com/api-reference/docs/authentication" },
      envVar: "MONDAY_API_KEY",
      completed: hasMonday,
    },
    {
      id: "openai",
      title: "Configure OpenAI",
      description: "The agent uses GPT-4o to interpret your business queries and generate insights.",
      link: { label: "Get API Key", url: "https://platform.openai.com/api-keys" },
      envVar: "OPENAI_API_KEY",
      completed: hasOpenAI,
    },
    {
      id: "import",
      title: "Import CSV Data to Monday.com",
      description: "Import your Deals and Work Orders CSV files as separate boards in Monday.com.",
      link: { label: "Monday.com Import Guide", url: "https://support.monday.com/hc/en-us/articles/360000460885" },
      completed: false,
    },
  ];

  const allDone = hasOpenAI && hasMonday;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/25 mb-5 animate-float">
          <span className="text-3xl">🧠</span>
        </div>
        <h1 className="text-2xl font-bold gradient-text mb-2">
          BI Agent Setup
        </h1>
        <p className="text-[--text-muted] text-sm max-w-md mx-auto">
          Complete the steps below to connect your Monday.com data and start asking business intelligence questions.
        </p>
      </div>

      {/* Status banner */}
      {!allDone && (
        <div className="glass border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Configuration Required</p>
            <p className="text-xs text-[--text-muted] mt-1">
              Set your API keys as environment variables, then restart the server.
              {" "}<button className="text-indigo-400 hover:text-indigo-300" onClick={onDismiss}>Or dismiss to chat anyway →</button>
            </p>
          </div>
        </div>
      )}

      {allDone && (
        <div className="glass border border-emerald-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-300">All Set! Ready to Query</p>
            <p className="text-xs text-[--text-muted] mt-1">
              Both API keys detected.{" "}
              <button className="text-indigo-400 hover:text-indigo-300" onClick={onDismiss}>
                Start chatting →
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3 mb-6">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`glass rounded-xl overflow-hidden border transition-all duration-200 ${
              step.completed ? "border-emerald-500/20" : "border-[--border-subtle]"
            }`}
          >
            <button
              onClick={() => setExpanded(expanded === step.id ? null : step.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-[--text-muted]"
                }`}>
                  {step.completed ? (
                    <CheckCircle2 size={16} />
                  ) : step.id === "monday" ? (
                    <Database size={16} />
                  ) : step.id === "openai" ? (
                    <Bot size={16} />
                  ) : (
                    <Key size={16} />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${step.completed ? "text-emerald-300" : "text-[--text-primary]"}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-[--text-muted]">{step.description}</p>
                </div>
              </div>
              <ChevronRight
                size={16}
                className={`text-[--text-muted] transition-transform ${expanded === step.id ? "rotate-90" : ""}`}
              />
            </button>

            {expanded === step.id && (
              <div className="px-4 pb-4 border-t border-[--border-subtle]">
                <div className="pt-3 space-y-3">
                  {step.envVar && (
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-[10px] text-[--text-muted] mb-1.5 uppercase tracking-wide">Add to .env file</p>
                      <code className="text-xs text-indigo-300 font-mono">
                        {step.envVar}=your_key_here
                      </code>
                    </div>
                  )}
                  {step.link && (
                    <a
                      href={step.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {step.link.label}
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Architecture note */}
      <div className="glass rounded-xl p-4 border border-[--border-subtle]">
        <p className="text-xs font-semibold text-[--text-primary] mb-2">Architecture Overview</p>
        <div className="flex items-center gap-2 text-[11px] text-[--text-muted] flex-wrap">
          <span className="px-2 py-1 bg-indigo-500/10 rounded text-indigo-400">Next.js 16</span>
          <ChevronRight size={10} />
          <span className="px-2 py-1 bg-violet-500/10 rounded text-violet-400">GPT-4o Agent</span>
          <ChevronRight size={10} />
          <span className="px-2 py-1 bg-cyan-500/10 rounded text-cyan-400">Monday.com API</span>
          <ChevronRight size={10} />
          <span className="px-2 py-1 bg-emerald-500/10 rounded text-emerald-400">PostgreSQL Cache</span>
        </div>
      </div>

      <p className="text-center text-[10px] text-[--text-muted] mt-5">
        Read-only access to Monday.com · Secure server-side API calls · No data stored permanently
      </p>
    </div>
  );
}
