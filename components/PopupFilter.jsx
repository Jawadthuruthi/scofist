"use client";

import { useCallback, useState } from "react";
import { X, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { MultiSelect } from "./ui/multi-select";

// Define all available operators
const OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "notEquals",
  CONTAINS: "contains",
  NOT_CONTAINS: "notContains",
  STARTS_WITH: "startsWith",
  ENDS_WITH: "endsWith",
  GREATER_THAN: "greaterThan",
  LESS_THAN: "lessThan",
  GREATER_THAN_OR_EQUAL: "greaterThanOrEqual",
  LESS_THAN_OR_EQUAL: "lessThanOrEqual",
  BETWEEN: "between",
  INCLUDES: "includes",
  EXCLUDES: "excludes",
  IS_EMPTY: "isEmpty",
  IS_NOT_EMPTY: "isNotEmpty",
  IS_NULL: "isNull",
  IS_NOT_NULL: "isNotNull",
  REGEX: "regex",
};

// Default operators by input type
const DEFAULT_OPERATORS = {
  text: OPERATORS.CONTAINS,
  number: OPERATORS.EQUALS,
  date: OPERATORS.EQUALS,
  select: OPERATORS.EQUALS,
  multiSelect: OPERATORS.INCLUDES,
  boolean: OPERATORS.EQUALS,
};

const getCurrentValue = (filterItem, currentFilter) => {
  if (currentFilter.value !== undefined) return currentFilter.value;
  if (typeof currentFilter !== "object") return currentFilter;
  return filterItem.inputType === "multiSelect" ? [] : "";
};

export default function PopupFilter({
  filterConfig = [],
  filters = {},
  setFilter,
  removeFilter,
  clearFilters,
  globalFilter,
  setGlobalFilter,
  hasFilters,
  buttonLabel = "Table",
}) {
  const [open, setOpen] = useState(false);

  // Enhanced filter change handler that works with different input types and operators
  const handleFilterChange = useCallback(
    (filterId, value, operator) => {
      if (
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0) ||
        value === undefined ||
        value === null
      ) {
        removeFilter(filterId);
      } else {
        setFilter(filterId, value, operator);
      }
    },
    [setFilter, removeFilter]
  );

  // Handle clearing filters and closing the dialog
  const handleClearFilters = useCallback(() => {
    clearFilters();
    setOpen(false);
  }, [clearFilters]);

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant={hasFilters ? "default" : "outline"}>
              <Filter />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[80%] mx-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>
                Filter{" "}
                {buttonLabel.trim().charAt(0).toUpperCase() +
                  buttonLabel.trim().slice(1)}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterConfig.map((filterItem) => {
                  const filterId = filterItem.id;
                  const currentFilter = filters[filterId] || {};
                  const currentValue = getCurrentValue(
                    filterItem,
                    currentFilter
                  );
                  const displayName = filterItem.label || filterId;
                  const inputType = filterItem.inputType || "text";
                  const operator =
                    currentFilter.operator ||
                    filterItem.operator ||
                    DEFAULT_OPERATORS[inputType] ||
                    OPERATORS.CONTAINS;
                  const options = filterItem.options || [];
                  const type = filterItem.type || "text";

                  return (
                    <div key={filterId} className="space-y-2">
                      <label className="text-sm font-medium block">
                        {displayName}
                      </label>

                      {inputType === "multiSelect" || inputType === "select" ? (
                        <MultiSelect
                          options={options}
                          value={currentValue}
                          onValueChange={(value) =>
                            handleFilterChange(filterId, value, operator)
                          }
                          placeholder={`Select ${displayName}...`}
                          multiSelect={inputType === "multiSelect"}
                        />
                      ) : (
                        <Input
                          placeholder={`Filter by ${displayName}...`}
                          value={currentValue}
                          type={type}
                          onChange={(e) =>
                            handleFilterChange(
                              filterId,
                              e.target.value,
                              operator
                            )
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={!hasFilters}
              >
                Clear All Filters
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {setGlobalFilter && (
          <div className="relative flex-1 max-w-sm hidden md:block">
            <Input
              placeholder="Search all..."
              value={globalFilter || ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            {globalFilter && (
              <X
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                onClick={() => setGlobalFilter("")}
              />
            )}
          </div>
        )}

        {hasFilters && (
          <Button variant="destructive" onClick={handleClearFilters}>
            Clear <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
