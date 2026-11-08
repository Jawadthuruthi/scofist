"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";
import {
  Share2,
  Copy,
  Check,
  Mail,
  FileText,
} from "lucide-react";

// Brand SVGs
const WhatsAppIcon = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08s.89 2.41 1.01 2.58c.13.17 1.75 2.67 4.24 3.75.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z" />
  </svg>
);

const TelegramIcon = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
  </svg>
);

const XTwitterIcon = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export default function ShareModal({
  open,
  onOpenChange,
  title = "Check this out",
  text = "",
  url = "",
  category = "Content",
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Compute final share URL safely
  const shareUrl =
    url ||
    (typeof window !== "undefined" ? window.location.href : "");

  // Clean snippet
  const snippet = text
    ? text.length > 140
      ? `${text.substring(0, 140).trim()}...`
      : text.trim()
    : "";

  const fullShareText = `*${title}*${
    snippet ? `\n\n${snippet}` : ""
  }\n\n${shareUrl}`;

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyFullText = async () => {
    const success = await copyToClipboard(fullShareText);
    if (success) {
      setCopiedText(true);
      toast.success("Post text and link copied!");
      setTimeout(() => setCopiedText(false), 2000);
    } else {
      toast.error("Failed to copy text");
    }
  };

  const openShareUrl = (targetUrl) => {
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const shareWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      fullShareText
    )}`;
    openShareUrl(waUrl);
  };

  const shareTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(`*${title}*`)}`;
    openShareUrl(tgUrl);
  };

  const shareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    openShareUrl(fbUrl);
  };

  const shareX = () => {
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      title
    )}&url=${encodeURIComponent(shareUrl)}`;
    openShareUrl(xUrl);
  };

  const shareLinkedIn = () => {
    const inUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl
    )}`;
    openShareUrl(inUrl);
  };

  const shareEmail = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(
      title
    )}&body=${encodeURIComponent(fullShareText)}`;
    if (typeof window !== "undefined") {
      window.location.href = mailto;
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: fullShareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          toast.error("Share failed");
        }
      }
    }
  };

  const shareOptions = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: <WhatsAppIcon className="w-6 h-6" />,
      colorClass:
        "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border-[#25D366]/20",
      action: shareWhatsApp,
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: <TelegramIcon className="w-6 h-6" />,
      colorClass:
        "bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc] hover:text-white border-[#0088cc]/20",
      action: shareTelegram,
    },
    {
      id: "x",
      name: "X (Twitter)",
      icon: <XTwitterIcon className="w-5 h-5" />,
      colorClass:
        "bg-neutral-900/10 dark:bg-white/10 text-neutral-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-neutral-300 dark:border-neutral-700",
      action: shareX,
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: <FacebookIcon className="w-5 h-5" />,
      colorClass:
        "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border-[#1877F2]/20",
      action: shareFacebook,
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: <LinkedInIcon className="w-5 h-5" />,
      colorClass:
        "bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white border-[#0A66C2]/20",
      action: shareLinkedIn,
    },
    {
      id: "email",
      name: "Email",
      icon: <Mail className="w-5 h-5" />,
      colorClass:
        "bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-500/20",
      action: shareEmail,
    },
    ...(canNativeShare
      ? [
          {
            id: "more",
            name: "More Apps",
            icon: <Share2 className="w-5 h-5" />,
            colorClass:
              "bg-purple-500/10 text-purple-600 hover:bg-purple-600 hover:text-white border-purple-500/20",
            action: handleNativeShare,
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-border shadow-2xl bg-white dark:bg-slate-900">
        <DialogHeader className="text-left pb-3 border-b border-gray-100 dark:border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Share {category}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Share this {category.toLowerCase()} with friends or on social media
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Snippet Preview */}
        <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-100 dark:border-border text-left">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
            {title}
          </h4>
          {snippet && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {snippet}
            </p>
          )}
        </div>

        {/* Shareable Platform Options Grid */}
        <div className="py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-0.5">
            Share To
          </p>
          <div className="grid grid-cols-4 gap-3">
            {shareOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  opt.action();
                }}
                className="group flex flex-col items-center gap-1.5 focus:outline-none"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-200 active:scale-95 group-hover:scale-105 group-hover:shadow-md ${opt.colorClass}`}
                >
                  {opt.icon}
                </div>
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white text-center truncate w-full">
                  {opt.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Copy Link Section */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-border">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
            Page Link
          </p>
          <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-slate-800/60 focus-within:ring-2 focus-within:ring-emerald-500/30">
            <span className="text-xs text-gray-600 dark:text-gray-300 font-mono truncate select-all flex-1 text-left">
              {shareUrl}
            </span>
            <Button
              type="button"
              size="sm"
              variant={copiedLink ? "default" : "secondary"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopyLink();
              }}
              className={`h-8 px-3 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                copiedLink
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-white dark:bg-slate-700 shadow-sm hover:bg-gray-100 dark:hover:bg-slate-600"
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          {/* Quick Copy Full Post Action */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopyFullText();
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors"
            >
              {copiedText ? (
                <>
                  <Check className="w-3 h-3" />
                  Full post details copied!
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3" />
                  Copy full post with details
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
