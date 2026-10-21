"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Download,
  Copy,
  Check,
  Printer,
  X,
  Loader2,
  BookOpen,
  Users,
  GraduationCap,
  Layers,
  FileText,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CollegeAdminAISearch({ settings, apiKey }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const institutionName =
    settings?.institution?.name || "Sa-adiya College of Integrated Studies";
  const institutionTagline =
    settings?.institution?.tagline || "Scofist Educational Management";

  const handleSearch = async (overrideQuery) => {
    const q = (overrideQuery || query).trim();
    if (!q) {
      toast.error("Please enter a question or search term");
      return;
    }

    if (overrideQuery) {
      setQuery(overrideQuery);
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/dashboard/ai-search", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "api-key": apiKey } : {}),
        },
        body: JSON.stringify({ query: q }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    } catch (err) {
      console.error("AI Search Error:", err);
      toast.error(err.message || "Failed to retrieve AI search results.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCopyText = async () => {
    if (!result?.answer) return;
    try {
      await navigator.clipboard.writeText(result.answer);
      setCopied(true);
      toast.success("AI response copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy text.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!result?.answer) return;
    setIsDownloadingPdf(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      // Header Banner
      doc.setFillColor(16, 85, 68); // Rich emerald
      doc.rect(0, 0, pageWidth, 60, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(institutionName, margin, 32);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(200, 235, 225);
      doc.text("College Admin AI Inquiry & Search Report", margin, 48);

      const generatedTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
      doc.text(`${generatedTime} IST`, pageWidth - margin, 48, { align: "right" });

      // Query Box
      let y = 80;
      doc.setFillColor(243, 246, 248);
      doc.roundedRect(margin, y, contentWidth, 36, 4, 4, "F");
      doc.setDrawColor(215, 222, 228);
      doc.roundedRect(margin, y, contentWidth, 36, 4, 4, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(50, 60, 70);
      doc.text("Query:", margin + 12, y + 22);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 25, 30);
      const queryLines = doc.splitTextToSize(result.query, contentWidth - 75);
      doc.text(queryLines[0] || result.query, margin + 55, y + 22);

      // Section: Answer
      y += 54;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(16, 85, 68);
      doc.text("Report / Generated Answer:", margin, y);

      y += 18;

      // Clean answer text for PDF (strip markdown markers for clean typography)
      const cleanText = result.answer
        .replace(/###\s*/g, "\n")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .trim();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(40, 45, 50);

      const lines = doc.splitTextToSize(cleanText, contentWidth);
      const lineHeight = 14;

      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > pageHeight - margin - 25) {
          // Footer for current page
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.text(
            `Page ${doc.internal.getNumberOfPages()}`,
            pageWidth / 2,
            pageHeight - 20,
            { align: "center" }
          );

          doc.addPage();
          y = margin + 15;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(40, 45, 50);
        }

        const line = lines[i];
        if (line.startsWith("📊") || line.startsWith("👥") || line.startsWith("📚") || line.startsWith("🎓") || line.startsWith("🏛️")) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(16, 85, 68);
          y += 6;
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(40, 45, 50);
        }

        doc.text(line, margin, y);
        y += lineHeight;
      }

      // Final Footer
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Generated via Scofist AI Assistant • Page ${doc.internal.getNumberOfPages()}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: "center" }
      );

      const safeFilename = result.query
        .slice(0, 25)
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();
      doc.save(`scofist_ai_${safeFilename || "report"}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF document.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Render markdown-like text nicely
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split("\n");
    const blocks = [];
    let currentTable = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        if (!currentTable) {
          currentTable = [];
        }
        currentTable.push(trimmed);
      } else {
        if (currentTable) {
          blocks.push({ type: "table", rows: currentTable });
          currentTable = null;
        }
        blocks.push({ type: "line", text: line, trimmed });
      }
    }

    if (currentTable) {
      blocks.push({ type: "table", rows: currentTable });
    }

    return (
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
        {blocks.map((block, idx) => {
          if (block.type === "table") {
            const rows = block.rows;
            if (rows.length === 0) return null;

            // First row is header
            const headerCells = rows[0]
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim());

            // Skip divider row (row with :--- or ---)
            const bodyRows = rows.slice(1).filter((r) => !/^[|\s-:]+$/.test(r));

            return (
              <div key={idx} className="my-3 overflow-x-auto rounded-lg border border-border/80 shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/80 text-foreground font-semibold border-b border-border/80">
                    <tr>
                      {headerCells.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 text-left font-semibold">
                          {renderInlineFormatting(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-card">
                    {bodyRows.map((rowStr, rIdx) => {
                      const cells = rowStr
                        .split("|")
                        .slice(1, -1)
                        .map((c) => c.trim());
                      return (
                        <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 align-top text-foreground/90">
                              {renderInlineFormatting(cell)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }

          const trimmed = block.trimmed;
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-base font-bold text-foreground mt-3 pt-1 border-b border-border/40 pb-1">
                {renderInlineFormatting(trimmed.replace("### ", ""))}
              </h3>
            );
          }

          if (trimmed.startsWith("#### ")) {
            return (
              <h4 key={idx} className="text-sm font-bold text-foreground mt-2">
                {renderInlineFormatting(trimmed.replace("#### ", ""))}
              </h4>
            );
          }

          if (trimmed.startsWith("---")) {
            return <hr key={idx} className="my-3 border-border/60" />;
          }

          if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
            const content = trimmed.substring(2);
            const isSubBullet = block.text.startsWith("   ") || block.text.startsWith("\t") || block.text.startsWith("  ");
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2",
                  isSubBullet
                    ? "pl-6 text-xs text-muted-foreground bg-muted/20 py-1 px-2.5 rounded border-l-2 border-emerald-500/40 my-0.5"
                    : "pl-2"
                )}
              >
                {!isSubBullet && <span className="text-primary font-bold mt-1 text-xs">•</span>}
                <span className="leading-relaxed">{renderInlineFormatting(content)}</span>
              </div>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const dotIdx = trimmed.indexOf(". ");
            const num = trimmed.substring(0, dotIdx + 1);
            const content = trimmed.substring(dotIdx + 2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-muted-foreground font-mono text-xs mt-0.5 min-w-[1.2rem]">{num}</span>
                <span>{renderInlineFormatting(content)}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineFormatting(trimmed)}</p>;
        })}
      </div>
    );
  };

  const renderInlineFormatting = (text) => {
    if (!text) return null;

    // Pattern to match markdown links [label](url), bold **bold**, code `code`
    const tokens = [];
    const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: "text", value: text.substring(lastIndex, match.index) });
      }
      const raw = match[0];
      if (raw.startsWith("[") && raw.includes("](") && raw.endsWith(")")) {
        const linkMatch = raw.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          tokens.push({ type: "link", label: linkMatch[1], href: linkMatch[2] });
        } else {
          tokens.push({ type: "text", value: raw });
        }
      } else if (raw.startsWith("**") && raw.endsWith("**")) {
        tokens.push({ type: "bold", value: raw.slice(2, -2) });
      } else if (raw.startsWith("`") && raw.endsWith("`")) {
        tokens.push({ type: "code", value: raw.slice(1, -1) });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push({ type: "text", value: text.substring(lastIndex) });
    }

    return tokens.map((token, i) => {
      if (token.type === "link") {
        return (
          <Link
            key={i}
            href={token.href}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all underline decoration-emerald-500/50 hover:decoration-emerald-500 mx-1 shadow-xs"
          >
            {token.label}
          </Link>
        );
      }
      if (token.type === "bold") {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {token.value}
          </strong>
        );
      }
      if (token.type === "code") {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-foreground">
            {token.value}
          </code>
        );
      }
      return token.value;
    });
  };

  return (
    <div className="w-full my-3 no-print">
      {/* Search Bar Container */}
      <div className="relative rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-1 border border-emerald-500/25 shadow-sm transition-all focus-within:shadow-md focus-within:border-emerald-500/40">
        <div className="rounded-xl bg-card/95 backdrop-blur-md p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Input Wrapper */}
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-3 flex items-center pointer-events-none text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Gemini AI or search students, faculty, timetable, library records..."
                className="w-full pl-10 pr-9 py-2.5 bg-background/80 hover:bg-background focus:bg-background rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all"
                disabled={loading}
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 justify-end">
              <Button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 h-10 shadow-sm transition-transform active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    <span>Ask AI</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Gemini Status */}
          <div className="mt-2.5 flex items-center justify-end gap-2 pt-2 border-t border-border/30 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Gemini AI Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <Card className="mt-3 border border-emerald-500/20 bg-card/60 backdrop-blur animate-pulse">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Analyzing college database & generating response...
              </p>
              <p className="text-xs text-muted-foreground">
                Scanning students, faculty, courses, library records, timetable, and circulars.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Card */}
      {result && !loading && (
        <Card ref={resultsRef} className="mt-3 border border-emerald-500/30 shadow-md bg-card overflow-hidden">
          {/* Card Header Bar */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-foreground">
                    AI Search Answer
                  </h4>
                  {result.isAiGenerated ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                      Gemini AI {result.model ? `(${result.model})` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30">
                      Database Grounded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  &ldquo;{result.query}&rdquo;
                </p>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Copy as Text */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyText}
                className="h-8 px-2.5 text-xs gap-1.5 hover:bg-muted"
                title="Copy response as text"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy Text</span>
                  </>
                )}
              </Button>

              {/* Download PDF */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="h-8 px-2.5 text-xs gap-1.5 hover:bg-emerald-500/10 hover:text-emerald-600 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                title="Download report as PDF document"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download PDF</span>
              </Button>

              {/* Print */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrint}
                className="h-8 w-8 p-0"
                title="Print this answer"
              >
                <Printer className="w-3.5 h-3.5" />
              </Button>

              {/* Dismiss */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setResult(null)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Sources Chips */}
          {result.sources && (
            <div className="bg-muted/30 px-4 sm:px-5 py-2 border-b flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground/80">
                Matched Sources:
              </span>
              {result.sources.books > 0 && (
                <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                  <BookOpen className="w-3 h-3 text-emerald-600" />
                  {result.sources.books} Books
                </Badge>
              )}
              {result.sources.users > 0 && (
                <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                  <Users className="w-3 h-3 text-blue-600" />
                  {result.sources.users} Users
                </Badge>
              )}
              {result.sources.courses > 0 && (
                <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                  <GraduationCap className="w-3 h-3 text-purple-600" />
                  {result.sources.courses} Courses
                </Badge>
              )}
              {result.sources.classes > 0 && (
                <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                  <Layers className="w-3 h-3 text-amber-600" />
                  {result.sources.classes} Classes
                </Badge>
              )}
              {result.sources.updates > 0 && (
                <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                  <FileText className="w-3 h-3 text-rose-600" />
                  {result.sources.updates} Announcements
                </Badge>
              )}
            </div>
          )}

          {/* Answer Content */}
          <CardContent className="p-4 sm:p-6 bg-card">
            <div className="prose dark:prose-invert max-w-none">
              {renderFormattedText(result.answer)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
