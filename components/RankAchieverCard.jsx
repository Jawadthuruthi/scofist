"use client";

import { memo } from "react";
import Image from "next/image";
import { Trophy, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RankAchieverCard = memo(({ achiever, canManage, onEdit, onDelete }) => {
  const displayRank = achiever.rank
    ? achiever.rank.toString().toLowerCase().includes("rank")
      ? achiever.rank
      : `Rank ${achiever.rank}`
    : "Rank Achiever";

  return (
    <Card
      className="overflow-hidden h-full hover:border-primary/50 transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-primary group"
      role="region"
      aria-labelledby={`achiever-${achiever._id}`}
    >
      <div className="flex h-full">
        {/* Photo Container */}
        <div className="w-24 xs:w-32 shrink-0 relative bg-muted/30 min-h-[5.5rem]">
          {achiever.photo?.url ? (
            <Image
              src={achiever.photo.url}
              alt={`${achiever.name} photo`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-amber-500/10 dark:bg-amber-500/5">
              <Trophy
                className="h-10 w-10 text-amber-500/70"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Details Container */}
        <div className="p-2.5 md:p-4 flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1.5 mb-1.5">
              <div className="truncate">
                <h3
                  id={`achiever-${achiever._id}`}
                  className="font-semibold text-sm truncate"
                  title={achiever.name}
                >
                  {achiever.name}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0">
                <Trophy className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                {displayRank}
              </span>
            </div>

            <div className="text-xs space-y-1">
              <div className="truncate">
                <span className="text-muted-foreground">Course: </span>
                <span className="font-medium text-foreground">
                  {achiever.course || "N/A"}
                </span>
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">College: </span>
                <span className="text-muted-foreground">
                  {achiever.college || "N/A"}
                </span>
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">Year: </span>
                <span className="font-medium text-primary">
                  {achiever.year || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons - College Admin only */}
          {canManage && (
            <div
              className="flex items-center justify-end gap-1 pt-2 border-t mt-2"
              data-html2canvas-ignore="true"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onEdit?.(achiever)}
                title="Edit Achiever"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete?.(achiever)}
                title="Delete Achiever"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
});

RankAchieverCard.displayName = "RankAchieverCard";

export default RankAchieverCard;
