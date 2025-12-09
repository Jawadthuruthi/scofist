"use client";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Sliders } from "lucide-react";
import { useState } from "react";

const ColumnCustomization = ({ table, columnsConfig }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Sliders />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mx-4" align="end">
        {columnsConfig.map((columnConfig) => {
          const columnId = columnConfig.accessorKey || columnConfig.id;
          if (!columnId) return null;

          const column = table.getColumn(columnId);

          // Skip if column doesn't exist in the table
          if (!column) return null;

          return (
            <DropdownMenuCheckboxItem
              key={columnId}
              className="capitalize"
              checked={column.getIsVisible()}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(value) => {
                column.toggleVisibility(!!value);
              }}
            >
              {(typeof columnConfig.header !== "function" && columnConfig.header) ||
                columnConfig.id ||
                columnConfig.accessorKey}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnCustomization;
