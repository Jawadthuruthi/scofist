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
      <DropdownMenuTrigger asChild onClick={() => setIsOpen(!isOpen)}>
        <Button variant="outline">
          <Sliders />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mx-4" align="end">
        {columnsConfig
          .filter((column) => column.accessorKey)
          .map((columnConfig) => {
            const column = table.getColumn(columnConfig.accessorKey);

            // Skip if column doesn't exist in the table
            if (!column) return null;

            return (
              <DropdownMenuCheckboxItem
                key={columnConfig.accessorKey}
                className="capitalize"
                checked={column.getIsVisible()}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(value) => {
                  column.toggleVisibility(!!value);
                }}
              >
                {columnConfig.header || columnConfig.accessorKey}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnCustomization;
