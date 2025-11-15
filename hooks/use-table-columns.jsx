"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ExternalLink, Pencil, Trash, User } from "lucide-react";
import Link from "next/link";

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

    if (col.type?.includes("array")) {
      columnDefinition.cell = ({ row }) => {
        const value = row.getValue(col.accessorKey);

        const displayValue = Array.isArray(value)
          ? value.join(", ")
          : value || "-";
        if (col.type?.includes("vertical")) {
          return (
            <div className="scrollable">
              {Array.isArray(value) ? (
                value.map((item, index) => <div key={index}>{item}</div>)
              ) : (
                <span>{displayValue}</span>
              )}
            </div>
          );
        }
        return <div>{displayValue}</div>;
      };
    }

    // Apply list if type includes "arrayWithValueKey"
    if (col.type?.includes("arrayWithValueKey")) {
      columnDefinition.cell = ({ row }) => {
        const items = row.getValue(col.accessorKey);

        if (col.type?.includes("list")) {
          return (
            <div className="font-medium">
              {items?.map((item, index) => (
                <div key={index}>{item?.[col?.valueKey]}</div>
              ))}
            </div>
          );
        }

        return (
          <div className="font-medium">
            {items?.length > 0 ? (
              items?.map((i) => i?.[col.valueKey]).join(", ")
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      };
    }

    // Apply nested object data if type includes "nestedObject"
    if (col.type?.includes("nestedObject")) {
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
    if (col.type?.includes("externalLink")) {
      const searchParams = col.searchParams ? `?${col.searchParams}` : "";
      columnDefinition.cell = ({ row }) => (
        <Link
          href={`${row.original[col.accessorKey] || col.accessorKey}/${row.original[col.endpointKey] + searchParams}`}
        >
          <ExternalLink className="text-muted-foreground h-5 w-5 print:hidden" />
        </Link>
      );
    }

    // Apply badge formatting if type includes "badge"
    if (col.type?.includes("badge")) {
      columnDefinition.cell = ({ row }) => {
        const status = row.getValue(col.accessorKey);
        let color;
        switch (status?.toLowerCase()) {
          case "active":
            color = "bg-green-200 text-green-800";
            break;
          case "graduated":
            color = "bg-blue-200 text-blue-800";
            break;
          case "dropped out":
            color = "bg-red-200 text-red-800";
            break;
          default:
            color = "bg-gray-200 text-gray-800";
        }
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}
          >
            {status}
          </span>
        );
      };
    }

    if (col.type?.includes("length")) {
      columnDefinition.cell = ({ row }) => {
        const length = row.original?.[col.valueKey]?.length || 0;
        return length;
      };
    }
    if (col.type?.includes("filteredLength")) {
      columnDefinition.cell = ({ row }) => {
        const length =
          row.original?.[col.valueKey]?.filter(
            (item) => item?.[col.accessorKey] === col.filterValue
          )?.length || 0;
        return length;
      };
    }

    if (col?.type?.includes("percentage")) {
      columnDefinition.cell = ({ row }) => {
        const total = row.original?.[col.totalKey]?.length || 0;
        const divide =
          row.original?.[col.totalKey]?.filter(
            (item) => item?.[col.filterKey] === col.filterValue
          )?.length || 0;
        const percentage = ((divide / total) * 100).toFixed(2);
        return `${percentage}%`;
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
      maxWidth: col.maxWidth || "auto", // Default max-width
    };

    return columnDefinition;
  });
};

export default useTableColumns;
