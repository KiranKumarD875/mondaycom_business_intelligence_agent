"use client";

import React, { useRef, useEffect, useState } from "react";
import { Send, Loader2, Mic, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className="w-full">
      <div
        className={cn(
          "glass-strong rounded-2xl transition-all duration-200",
          "focus-within:border-indigo-500/40 focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.2)]",
          disabled && "opacity-50"
        )}
      >
        <div className="flex items-end gap-2 p-2">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your pipeline, revenue, sector performance, team metrics..."
            disabled={isLoading || disabled}
            rows={1}
            className={cn(
              "flex-1 bg-transparent resize-none outline-none border-none",
              "text-sm text-[--text-primary] placeholder-[--text-muted]",
              "px-3 py-2.5 leading-relaxed min-h-[44px] max-h-[160px]",
              "scrollbar-none"
            )}
            style={{ scrollbarWidth: "none" }}
          />

          {/* Actions */}
          <div className="flex items-center gap-1 pb-1.5 pr-1">
            {/* Hint buttons (cosmetic) */}
            <button
              type="button"
              disabled
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl text-[--text-muted] hover:text-[--text-secondary] transition-colors"
              title="Voice input (coming soon)"
            >
              <Mic size={15} />
            </button>
            <button
              type="button"
              disabled
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl text-[--text-muted] hover:text-[--text-secondary] transition-colors"
              title="Attach file (coming soon)"
            >
              <Paperclip size={15} />
            </button>

            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
                canSubmit
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95"
                  : "bg-white/5 text-[--text-muted] cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="px-4 pb-2.5 flex items-center justify-between">
          <p className="text-[10px] text-[--text-muted]">
            {isLoading ? (
              <span className="text-indigo-400">🔍 Querying Monday.com & analyzing data...</span>
            ) : (
              <span>Press Enter to send · Shift+Enter for new line</span>
            )}
          </p>
          <span className="text-[10px] text-[--text-muted]">{value.length > 0 ? `${value.length}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
