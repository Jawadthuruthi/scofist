"use client";
import * as React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareModal from "@/components/ShareModal";

export default function ShareButton({
  title,
  text,
  url,
  imageUrl,
  buttonText = "Share this Post",
  category,
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");
  const determinedCategory =
    category ||
    (buttonText.toLowerCase().includes("article")
      ? "Article"
      : buttonText.toLowerCase().includes("update")
      ? "Update"
      : "Post");

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="rounded-full flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all active:scale-95 shadow-sm hover:shadow-md"
      >
        <Share2 className="w-4 h-4" />
        {buttonText}
      </Button>
      <ShareModal
        open={isOpen}
        onOpenChange={setIsOpen}
        title={title}
        text={text}
        url={shareUrl}
        category={determinedCategory}
      />
    </>
  );
}
