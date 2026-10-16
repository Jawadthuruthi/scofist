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
    : "";

  const courseAndYear = [achiever.course, achiever.year]
    .filter(Boolean)
    .join(" - ");

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
            <div className="mb-1.5">
              <h3
                id={`achiever-${achiever._id}`}
                className="font-semibold text-sm break-words leading-snug"
                title={achiever.name}
              >
                {achiever.name}
              </h3>
            </div>

            <div className="text-xs space-y-1">
              {(achiever.course || achiever.year) && (
                <div className="break-words leading-normal" title={courseAndYear}>
                  {achiever.course && (
                    <span className="font-medium text-foreground">
                      {achiever.course}
                    </span>
                  )}
                  {achiever.course && achiever.year && (
                    <span className="text-muted-foreground"> - </span>
                  )}
                  {achiever.year && (
                    <span className="font-medium text-primary">
                      {achiever.year}
                    </span>
                  )}
                </div>
              )}
              {achiever.college && (
                <div
                  className="text-muted-foreground break-words leading-normal"
                  title={achiever.college}
                >
                  {achiever.college}
                </div>
              )}
              {displayRank && (
                <div className="font-semibold text-amber-600 dark:text-amber-400 break-words leading-normal">
                  {displayRank}
                </div>
              )}
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
