"use client";
import * as React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ShareButton({ title, text, url, imageUrl, buttonText = "Share this Update" }) {
  const handleShare = async () => {
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const boldTitle = `*${title}*`;
    const shareData = {
      title: title,
      text: `${boldTitle}\n\n${text?.substring(0, 160) || ""}...\n\nRead more at:`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success("Link and details copied to clipboard!");
      } else {
        toast.error("Sharing is not supported on this browser.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
        // Fallback to clipboard if share throws an error (e.g., NotAllowedError or TypeError)
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
            toast.success("Link copied to clipboard (sharing failed)!");
          } catch (copyErr) {
            toast.error("Sharing failed. Try copying the link manually.");
          }
        } else {
          toast.error("Sharing failed. Try copying the link manually.");
        }
      }
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleShare}
      className="rounded-full flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all active:scale-95 shadow-sm hover:shadow-md"
    >
      <Share2 className="w-4 h-4" />
      {buttonText}
    </Button>
  );
}
