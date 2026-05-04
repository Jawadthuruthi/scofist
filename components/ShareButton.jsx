"use client";
import * as React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ShareButton({ title, text, url }) {
  const handleShare = async () => {
    const shareData = {
      title,
      text: text?.substring(0, 100),
      url: url || typeof window !== "undefined" ? window.location.href : "",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
        toast.error("Sharing failed. Try copying the link manually.");
      }
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleShare}
      className="rounded-full flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all active:scale-95"
    >
      <Share2 className="w-4 h-4" />
      Share this Update
    </Button>
  );
}
