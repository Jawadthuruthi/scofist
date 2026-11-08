"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronRight, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import ShareModal from "@/components/ShareModal";

export default function UpdateCard({ update }) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <>
      <Link href={`/updates/${update._id}`}>
        <Card className="group overflow-hidden border border-gray-100 dark:border-border shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col bg-white dark:bg-slate-900 rounded-2xl cursor-pointer h-full">
          {update.image?.url ? (
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={update.image.url}
                alt={update.heading}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ) : (
            <div className="aspect-[16/10] bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <CalendarIcon className="w-12 h-12 text-emerald-200 group-hover:text-emerald-300 transition-colors" />
            </div>
          )}
          <CardContent className="flex-1 p-5 md:p-6 flex flex-col">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest mb-3">
              <span className="bg-emerald-100 px-2 py-0.5 rounded">
                {update.date ? format(new Date(update.date), "MMM d, yyyy") : "Recent"}
              </span>
            </div>
            <h2 className="font-google-sans text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-tight">
              {update.heading}
            </h2>
            <p className="font-google-sans text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
              {update.news}
            </p>

            <div className="pt-4 border-t border-gray-50 dark:border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                Read More <ChevronRight className="w-3 h-3" />
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsShareOpen(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-emerald-600 transition-colors"
                title="Share this update"
              >
                <Share2 className="w-3 h-3" />
                Share
              </button>
            </div>
          </CardContent>
        </Card>
      </Link>
      <ShareModal
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        title={update.heading}
        text={update.news}
        url={`${typeof window !== "undefined" ? window.location.origin : ""}/updates/${update._id}`}
        category="Update"
      />
    </>
  );
}
