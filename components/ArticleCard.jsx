"use client";
import * as React from "react";
import Link from "next/link";
import { Newspaper, Share2 } from "lucide-react";
import { toast } from "sonner";

import ShareModal from "@/components/ShareModal";

export default function ArticleCard({ article }) {
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  const shareArticle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareOpen(true);
  };

  return (
    <>
      <Link href={`/articles/${article._id}`} className="block h-full">
      <div className="group overflow-hidden border border-white/[0.08] hover:border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.7)] transition-all duration-300 flex flex-col bg-[#0c140e] rounded-2xl cursor-pointer h-full">
        {article.image?.url ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
            <img
              src={article.image.url}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c140e] via-transparent to-transparent opacity-80" />
          </div>
        ) : (
          <div className="aspect-[16/10] bg-white/[0.02] border-b border-white/[0.04] flex items-center justify-center group-hover:bg-white/[0.04] transition-colors">
            <Newspaper className="w-10 h-10 text-[#8f9b8a]/40 group-hover:text-[#8f9b8a]/70 transition-colors" />
          </div>
        )}
        <div className="flex-1 p-5 md:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-medium tracking-wide text-[#9ca59a] bg-white/[0.04] border border-white/10 px-2.5 py-0.5 rounded-full">
              {article.date
                ? new Date(article.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Recent"}
            </span>
            {article.author && (
              <span className="text-[#869183] text-xs font-normal truncate">
                by {article.author}
              </span>
            )}
          </div>
          <h2 className="font-['Playfair_Display',serif] text-xl font-normal text-[#f7f5ee] group-hover:text-white transition-colors line-clamp-2 leading-snug mb-2.5">
            {article.title}
          </h2>
          <p className="text-[#a6a095] text-sm leading-relaxed line-clamp-3 flex-1 mb-4">
            {article.content}
          </p>
          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-medium text-[#c5a059] group-hover:text-[#e0b86a] transition-colors">
              Read publication →
            </span>
            <button
              onClick={shareArticle}
              className="flex items-center gap-1.5 text-xs text-[#869183] hover:text-[#f7f5ee] transition-colors px-2 py-1 rounded hover:bg-white/[0.04]"
              title="Share this article"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
    <ShareModal
      open={isShareOpen}
      onOpenChange={setIsShareOpen}
      title={article.title}
      text={article.content}
      url={`${typeof window !== "undefined" ? window.location.origin : ""}/articles/${article._id}`}
      category="Article"
    />
    </>
  );
}
