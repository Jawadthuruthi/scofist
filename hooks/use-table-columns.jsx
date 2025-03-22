"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Pencil, Trash, User } from "lucide-react";

const useTableColumns = (columnConfig) => {
  return columnConfig.map((col) => {
    let columnDefinition = { ...col };

    // Handle checkboxes (for row selection)
    if (col.type?.includes("checkbox")) {
      columnDefinition.enableSorting = false;
      columnDefinition.enableHiding = false;
      columnDefinition.meta = { className: "print:hidden" };

      columnDefinition.header = ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      );

      columnDefinition.cell = ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      );
    }

    // Handle Serial Number Column (Dynamically generated)
    if (col.type?.includes("serialNo")) {
      columnDefinition.cell = ({ row }) => {
        return <div className="font-medium">{row.index + 1}</div>;
      };
    }

    // Apply sorting if type includes "sortable"
    if (col.type?.includes("sortable")) {
      columnDefinition.header = ({ column }) => (
        <div className="flex items-center ">
          <span>{col.header}</span>
          <Button
            className="px-0 ml-1 print:hidden"
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    // Apply currency formatting if type includes "currency"
    if (col.type?.includes("currency")) {
      columnDefinition.cell = ({ row }) => {
        const amount = parseFloat(row.getValue(col.accessorKey));
        return (
          <div className="font-medium">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "INR",
            }).format(amount)}
          </div>
        );
      };
    }

    // Apply list if type includes "array"
    if (col.type?.includes("array")) {
      columnDefinition.cell = ({ row }) => {
        const value = row.getValue(col.accessorKey);

        return (
          <div className="font-medium">
            {value.length > 0 ? (
              value.join(", ")
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      };
    }
    // Apply nested data if type includes "nested"
    if (col.type?.includes("nested")) {
      columnDefinition.cell = ({ row }) => {
        const value = row.getValue(col.accessorKey);

        return (
          <div className="font-medium">
            {Object.values(value).filter(Boolean).join(", ")}
          </div>
        );
      };
    }

    // Apply date formatting if type includes "date"
    if (col.type?.includes("date")) {
      columnDefinition.cell = ({ row }) => {
        const value = new Date(row.getValue(col.accessorKey));
        const date = value.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        return <div>{date === "Invalid Date" ? "" : date}</div>;
      };
    }

    // Apply boolean formatting if type includes "boolean"
    if (col.type?.includes("boolean")) {
      columnDefinition.cell = ({ row }) => {
        const value = row.getValue(col.accessorKey);
        return value ? "✅ Yes" : "❌ No";
      };
    }

    // Apply avatar formatting if type includes "avatar"
    if (col.type?.includes("avatar")) {
      columnDefinition.cell = ({ row }) => {
        const image = row.getValue(col.accessorKey);
        const name = row.getValue("name");

        return (
          <Avatar className="w-7 h-7">
            <AvatarImage
              src={image?.url || null}
              alt="Profile"
              onError={(e) => {
                e.currentTarget.style.display = "none"; // Hide broken image
              }}
            />
            <AvatarFallback>
              {name ? (
                name.charAt(0).toUpperCase()
              ) : (
                <User className="w-5 h-5" />
              )}
            </AvatarFallback>
          </Avatar>
        );
      };
    }

    // Apply link formatting if type includes "link"
    if (col.type?.includes("link")) {
      columnDefinition.cell = ({ row }) => (
        <a
          href={row.getValue(col.link || col.accessorKey)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {row.getValue(col.accessorKey)}
        </a>
      );
    }

    // Apply badge formatting if type includes "badge"
    if (col.type?.includes("badge")) {
      columnDefinition.cell = ({ row }) => {
        const status = row.getValue(col.accessorKey);
        const color =
          status === "active"
            ? "bg-green-200 text-green-800"
            : "bg-red-200 text-red-800";
        return (
          <span className={`py-1 rounded text-sm font-semibold ${color}`}>
            {status}
          </span>
        );
      };
    }

    // Apply actions if type includes "actions"
    if (col.type?.includes("actions")) {
      columnDefinition.cell = ({ row }) => (
        <div className="flex gap-2">
          <Button className="px-0" variant="outline" size="icon">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button className="px-0" variant="destructive" size="icon">
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    columnDefinition.meta = {
      width: col.width || "auto", // Default: auto
      minWidth: col.minWidth || "100px", // Default min-width
      maxWidth: col.maxWidth || "300px", // Default max-width
    };

    return columnDefinition;
  });
};

export default useTableColumns;
