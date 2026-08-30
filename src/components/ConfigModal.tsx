"use client";

import { useState } from "react";
import { X, Key, ExternalLink, Copy, Check } from "lucide-react";

interface ConfigModalProps {
  onClose: () => void;
}

export default function ConfigModal({ onClose }: ConfigModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[--border-subtle]">
          <div className="flex items-center gap-2.5">
            <Key size={16} className="text-indigo-400" />
            <h2 className="text-base font-bold text-[--text-primary]">Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-[--text-muted] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-[--text-primary] mb-3">Required Environment Variables</h3>
            <div className="space-y-3">
              <EnvVar
                name="MONDAY_API_KEY"
                description="Your Monday.com API token (Personal or OAuth)"
                link="https://developer.monday.com/api-reference/docs/authentication"
                example="your_monday_api_token_here"
                copied={copied === "MONDAY_API_KEY"}
                onCopy={() => copyText("MONDAY_API_KEY=your_token_here", "MONDAY_API_KEY")}
              />
              <EnvVar
                name="OPENAI_API_KEY"
                description="OpenAI API key for GPT-4o agent intelligence"
                link="https://platform.openai.com/api-keys"
                example="sk-proj-..."
                copied={copied === "OPENAI_API_KEY"}
                onCopy={() => copyText("OPENAI_API_KEY=sk-proj-...", "OPENAI_API_KEY")}
              />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-[--text-primary] mb-3">Optional Board IDs</h3>
            <p className="text-xs text-[--text-muted] mb-3">
              If the agent cannot auto-detect your boards, specify board IDs explicitly.
            </p>
            <div className="space-y-3">
              <EnvVar
                name="MONDAY_DEALS_BOARD_ID"
                description="Board ID for your Deals/Pipeline board"
                example="1234567890"
                copied={copied === "MONDAY_DEALS_BOARD_ID"}
                onCopy={() => copyText("MONDAY_DEALS_BOARD_ID=1234567890", "MONDAY_DEALS_BOARD_ID")}
              />
              <EnvVar
                name="MONDAY_WO_BOARD_ID"
                description="Board ID for your Work Orders board"
                example="9876543210"
                copied={copied === "MONDAY_WO_BOARD_ID"}
                onCopy={() => copyText("MONDAY_WO_BOARD_ID=9876543210", "MONDAY_WO_BOARD_ID")}
              />
            </div>
          </section>

          <section className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-indigo-400 mb-2">Finding Board IDs</h3>
            <p className="text-xs text-[--text-muted] leading-relaxed">
              Open your Monday.com board → Look at the URL:{" "}
              <code className="text-indigo-300 bg-indigo-500/10 px-1 rounded text-[11px]">
                monday.com/boards/<strong>BOARD_ID</strong>
              </code>
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[--text-muted] mb-2 uppercase tracking-wide">Monday.com API Setup</h3>
            <div className="space-y-2">
              {[
                "1. Go to monday.com → Profile → API",
                "2. Generate a Personal API Token",
                "3. Ensure the token has 'boards:read' permission",
                "4. Import your CSV files as separate boards",
                "5. Set the MONDAY_API_KEY environment variable",
              ].map((step) => (
                <p key={step} className="text-xs text-[--text-muted] leading-relaxed">
                  {step}
                </p>
              ))}
            </div>
            <a
              href="https://developer.monday.com/api-reference/docs/authentication"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Monday.com API Docs
              <ExternalLink size={11} />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

function EnvVar({
  name,
  description,
  link,
  example,
  copied,
  onCopy,
}: {
  name: string;
  description: string;
  link?: string;
  example: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <code className="text-sm font-bold text-indigo-300">{name}</code>
        <div className="flex items-center gap-1.5">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[--text-muted] hover:text-indigo-400 transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={onCopy}
            className="text-[--text-muted] hover:text-indigo-400 transition-colors"
            title="Copy env var"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
      <p className="text-xs text-[--text-muted] mb-2">{description}</p>
      <code className="text-[10px] text-slate-400 font-mono bg-black/20 px-2 py-1 rounded block">
        {name}={example}
      </code>
    </div>
  );
}
