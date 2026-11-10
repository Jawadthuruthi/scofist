"use client";

import { memo } from "react";
import Image from "next/image";
import { UserCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

const FacultyProfileCard = memo(({ faculty, assignedClass }) => {
  const place = faculty.address?.place || faculty.place;
  const district = faculty.address?.district || faculty.district;

  return (
    <Card
      className="overflow-hidden h-full hover:border-primary/50 transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
      role="region"
      aria-labelledby={`faculty-${faculty._id}`}
    >
      <div className="flex h-full">
        <div className="w-24 xs:w-32 shrink-0 relative bg-muted/30 min-h-[5rem]">
          {faculty.profilePic?.url ? (
            <Image
              src={faculty?.profilePic?.url}
              alt={`${faculty.name} profile picture`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <UserCheck
                className="h-12 w-12 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        <div className="p-2 md:p-4 flex-1 min-w-0">
          <div className="flex justify-between mb-1 md:mb-2">
            <div className="truncate">
              <h3 id={`faculty-${faculty._id}`} className="font-semibold text-sm truncate">
                {faculty.name}
              </h3>
              {place && (
                <p className="text-muted-foreground text-xs truncate">{place}</p>
              )}
              {district && (
                <p className="text-muted-foreground text-xs truncate">{district}</p>
              )}
            </div>
          </div>
          <div className="text-xs space-y-1">
            <div className="truncate">
              <span className="text-muted-foreground">Contact: </span>
              <span>{faculty.contactNumber || "N/A"}</span>
            </div>
            <div className="truncate">
              <span className="text-muted-foreground">Class: </span>
              <span>{assignedClass || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
FacultyProfileCard.displayName = "FacultyProfileCard";

export default FacultyProfileCard;
