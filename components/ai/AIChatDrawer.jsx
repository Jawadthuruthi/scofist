"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Loader2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FRIENDLY_TOOL_NAMES = {
  lookupDirectory: "Directory",
  checkAttendance: "Attendance",
  getTimetable: "Timetable",
  getAcademicMarks: "Exam Marks",
  getOperationsStatus: "Fees & Passes",
};

// Define ChatInputForm outside AIChatDrawer so React never unmounts the input on re-renders
const ChatInputForm = memo(function ChatInputForm({
  input,
  onChange,
  onSubmit,
  isLoading,
  autoFocus = false,
  disabled = false,
  className = "",
  inputRef,
}) {
  return (
    <form onSubmit={onSubmit} className={`flex gap-2 items-center ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={input || ""}
        onChange={onChange}
        placeholder="Ask about attendance, timetable, marks..."
        className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 shadow-sm placeholder:text-zinc-400 disabled:opacity-50"
        disabled={isLoading || disabled}
        autoFocus={autoFocus}
        tabIndex={disabled ? -1 : 0}
      />
      <Button
        type="submit"
        disabled={isLoading || disabled || !input?.trim()}
        className="h-9 px-3.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
});

export default function AIChatDrawer({ open, onOpenChange, hideFloatingButton = false }) {
  const [mounted, setMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = (val) => {
    if (onOpenChange) onOpenChange(val);
    else setInternalOpen(val);
  };
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const prevOpenRef = useRef(isOpen);

  // Safely manage focus: only auto-focus on desktop when explicitly opened
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  const {
    messages = [],
    sendMessage,
    status,
    error,
    regenerate,
    setMessages,
  } = useChat({
    api: "/api/chat",
    onError: (err) => {
      console.error("AI Chat Error:", err);
    },
  });

  const handleResetChat = () => {
    setMessages([]);
    setInput("");
  };

  const handleCloseAssistant = () => {
    if (onOpenChange) onOpenChange(false);
    else setInternalOpen(false);
    setMessages([]);
    setInput("");
  };

  useEffect(() => {
    if (prevOpenRef.current === true && isOpen === false) {
      setMessages([]);
      setInput("");
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, setMessages]);

  useEffect(() => {
    setMounted(true);

    const handleOpen = () => {
      if (onOpenChange) onOpenChange(true);
      else setInternalOpen(true);
    };
    const handleClose = () => {
      handleCloseAssistant();
    };
    const handleToggle = () => {
      if (isOpen) {
        handleCloseAssistant();
      } else {
        if (onOpenChange) onOpenChange(true);
        else setInternalOpen(true);
      }
    };

    window.addEventListener("open-ai-chat", handleOpen);
    window.addEventListener("close-ai-chat", handleClose);
    window.addEventListener("toggle-ai-chat", handleToggle);

    return () => {
      window.removeEventListener("open-ai-chat", handleOpen);
      window.removeEventListener("close-ai-chat", handleClose);
      window.removeEventListener("toggle-ai-chat", handleToggle);
    };
  }, [onOpenChange, isOpen]);

  const isLoading = status === "streaming" || status === "submitted";
  const hasConversation = messages.length > 0;

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(
      { text: input },
      { body: { clientTime: new Date().toISOString() } }
    );
    setInput("");
  };

  // Optimized auto-scroll during token streaming using container scrollTop to avoid document layout reflows
  useEffect(() => {
    if (!isOpen) return;
    if (isLoading) {
      if (scrollContainerRef.current) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Floating Action Button — hidden when controlled externally */}
      {!hideFloatingButton && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={() => setIsOpen((prev) => !prev)}
            className="relative h-14 w-14 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center p-0"
            aria-label="Open AI Assistant"
          >
            <Sparkles className="h-6 w-6 animate-pulse" />
            <span className="sr-only">Open AI Assistant</span>
            {/* Subtle status indicator dot */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>
          </Button>
        </div>
      )}

      {/* Slide-over Drawer Backdrop — starts below the topbar, stops above bottom bar on mobile */}
      {isOpen && (
        <div
          className="fixed top-14 bottom-16 lg:bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={handleCloseAssistant}
        />
      )}

      {/* Slide-over Drawer Panel — sits below topbar (top-14), stops above bottom bar on mobile */}
      <div
        aria-hidden={!isOpen}
        className={`fixed top-14 bottom-16 lg:bottom-0 right-0 z-40 w-full sm:w-[480px] lg:w-[520px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
          }`}
      >
        {/* Drawer Header — sticky so it never scrolls with messages */}
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Scofist Assistant
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Direct answers from official college records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {hasConversation && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetChat}
                className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                title="Reset chat log"
                aria-label="Reset chat log"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseAssistant}
              className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              title="Close assistant"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drawer Body / Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {!hasConversation ? (
            /* ── Empty state: icon with AI text + heading + search bar centred ── */
            <div className="h-full flex flex-col justify-center items-center text-center p-6 gap-6">
              <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-inner">
                <span className="text-lg font-bold tracking-tight">AI</span>
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  How can I help you today?
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Ask about student contacts, daily attendance, class timetables, exam marks, or fee dues.
                </p>
              </div>

              {/* Centred search bar */}
              <div className="w-full max-w-sm">
                <ChatInputForm
                  inputRef={inputRef}
                  input={input}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  disabled={!isOpen}
                  autoFocus={false}
                />
              </div>
            </div>
          ) : (
            /* ── Conversation messages ── */
            messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs leading-relaxed ${isUser ? "justify-end" : "justify-start"
                    }`}
                >
                  {!isUser && (
                    <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[85%] ${isUser
                      ? "bg-emerald-600 text-white rounded-tr-none shadow-sm font-normal"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200 dark:border-zinc-800 font-normal"
                      }`}
                  >
                    {(() => {
                      const text =
                        m.content ||
                        (m.parts
                          ? m.parts
                            .filter((p) => p.type === "text")
                            .map((p) => p.text)
                            .join("")
                          : "");

                      // Collect friendly, deduplicated badges for non-technical users
                      const toolBadges = (() => {
                        if (!Array.isArray(m.parts)) return [];
                        const seen = new Set();
                        const badges = [];

                        for (const p of m.parts) {
                          const rawName =
                            p.toolInvocation?.toolName ||
                            p.toolName ||
                            (p.type === "dynamic-tool" ? p.toolName : null) ||
                            (p.type === "tool-input-available" ? p.toolName : null);

                          if (rawName && !seen.has(rawName)) {
                            seen.add(rawName);
                            const label = FRIENDLY_TOOL_NAMES[rawName] || "College Records";
                            badges.push(label);
                          }
                        }
                        return badges;
                      })();

                      const hasText = Boolean(text && text.trim().length > 0);

                      return (
                        <div className="space-y-1.5">
                          {toolBadges.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {toolBadges.map((badgeLabel, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/40 text-[11px] font-medium"
                                >
                                  <span className="text-emerald-500 font-bold">✓</span> Checked {badgeLabel}
                                </span>
                              ))}
                            </div>
                          )}

                          {isUser ? (
                            <div className="whitespace-pre-wrap">{text}</div>
                          ) : hasText ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed space-y-1.5 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>p]:mb-1 [&>h3]:text-xs [&>h3]:font-bold [&>h3]:mt-2 [&>table]:w-full [&>table]:border-collapse [&>table]:my-2 [&>table_th]:border [&>table_th]:border-zinc-300 dark:[&>table_th]:border-zinc-700 [&>table_th]:px-2 [&>table_th]:py-1 [&>table_td]:border [&>table_td]:border-zinc-200 dark:[&>table_td]:border-zinc-800 [&>table_td]:px-2 [&>table_td]:py-1">
                              <ReactMarkdown>{text}</ReactMarkdown>
                            </div>
                          ) : isLoading ? (
                            <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 italic">
                              <Loader2 className="h-3 w-3 animate-spin text-emerald-600" /> Looking up information...
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">
                              No matching records found. Please try rephrasing your question.
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {isUser && (
                    <div className="h-7 w-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Dedicated loading indicator only shown before assistant bubble mounts */}
          {isLoading && hasConversation && messages[messages.length - 1].role === "user" && (
            <div className="flex gap-3 text-xs justify-start items-center text-zinc-500 dark:text-zinc-400 pl-1">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2.5 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-800">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                <span>Finding details for you...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Could not load response</p>
                <p className="text-[11px] opacity-80 mt-0.5">{error.message || "Please try again in a moment."}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerate()}
                  className="mt-2 h-7 text-xs border-red-200 text-red-700 dark:border-red-800 dark:text-red-300"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Retry
                </Button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Drawer Footer / Input Form — only shown when conversation has started */}
        {hasConversation && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
            <ChatInputForm
              inputRef={inputRef}
              input={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              disabled={!isOpen}
              autoFocus={false}
            />
            <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 mt-2">
              Answers are verified directly from official college records.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
