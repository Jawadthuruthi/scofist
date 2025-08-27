"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { X, Filter } from "lucide-react";
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
  DATE_RANGE: "dateRange",
};

// Default operators by input type
const DEFAULT_OPERATORS = {
  text: OPERATORS.CONTAINS,
  number: OPERATORS.EQUALS,
  date: OPERATORS.EQUALS,
  dateRange: OPERATORS.DATE_RANGE,
  select: OPERATORS.EQUALS,
  multiSelect: OPERATORS.INCLUDES,
  boolean: OPERATORS.EQUALS,
};

const getCurrentValue = (filterItem, currentFilter) => {
  if (currentFilter?.value !== undefined) return currentFilter.value;
  if (typeof currentFilter !== "object") return currentFilter;
  if (filterItem.inputType === "dateRange") {
    return { startDate: "", endDate: "" };
  }
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
  title = "Table",
}) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync local filters with props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Helper function to get filtered options with support for multiple filters
  const getFilteredOptions = useCallback(
    (filterItem) => {
      const currentValue = getCurrentValue(
        filterItem,
        localFilters[filterItem.id] || {}
      );

      // Handle legacy single filter
      if (filterItem.filter && !filterItem.filters) {
        const dependentFieldName = filterItem.filter.dependentField;
        const key = filterItem.filter.key;
        const dependentValue =
          localFilters[dependentFieldName]?.value ||
          localFilters[dependentFieldName];

        if (!dependentValue) {
          return filterItem.options || [];
        }

        const filteredOptions = (filterItem.options || []).filter((option) => {
          if (key) {
            return option?.[dependentFieldName]?.[key] === dependentValue;
          }
          return option?.[dependentFieldName] === dependentValue;
        });

        // Always include currently selected options to prevent them from disappearing
        const selectedOptions = (filterItem.options || []).filter((option) =>
          Array.isArray(currentValue)
            ? currentValue.includes(option.value)
            : currentValue === option.value
        );

        return [
          ...filteredOptions,
          ...selectedOptions.filter(
            (opt) => !filteredOptions.some((f) => f.value === opt.value)
          ),
        ];
      }

      // Handle multiple filters
      if (filterItem.filters && filterItem.filters.length > 0) {
        let filteredOptions = filterItem.options || [];

        // Apply each filter sequentially
        filterItem.filters.forEach((filter) => {
          const dependentFieldName = filter.dependentField;
          const key = filter.key;
          const valueToMatch =
            localFilters[dependentFieldName]?.value ||
            localFilters[dependentFieldName];

          if (valueToMatch) {
            filteredOptions = filteredOptions.filter((option) => {
              if (key) {
                return option?.[dependentFieldName]?.[key] === valueToMatch;
              }
              return option?.[dependentFieldName] === valueToMatch;
            });
          }
        });

        // Always include currently selected options to prevent them from disappearing
        const selectedOptions = (filterItem.options || []).filter((option) =>
          Array.isArray(currentValue)
            ? currentValue.includes(option.value)
            : currentValue === option.value
        );

        return [
          ...filteredOptions,
          ...selectedOptions.filter(
            (opt) => !filteredOptions.some((f) => f.value === opt.value)
          ),
        ];
      }

      // No filters - return all options
      return filterItem.options || [];
    },
    [localFilters]
  );

  // Enhanced filter change handler with dependent field support
  const handleFilterChange = useCallback(
    (filterId, value, operator, nestedArrayField) => {
      // Update local filters first
      const updatedLocalFilters = { ...localFilters, [filterId]: value };

      // Check for dependent filters that need to be reset
      filterConfig.forEach((filterItem) => {
        const dependentFields = [];

        // Collect all dependent fields from both single filter and filters array
        if (filterItem.filter?.dependentField) {
          dependentFields.push(filterItem.filter.dependentField);
        }
        if (filterItem.filters) {
          filterItem.filters.forEach((filter) => {
            if (filter.dependentField) {
              dependentFields.push(filter.dependentField);
            }
          });
        }

        // Check if this filter depends on the field that just changed
        if (dependentFields.includes(filterId)) {
          // Get the new filtered options for this dependent filter
          const newFilteredOptions = getFilteredOptionsForField(
            filterItem,
            updatedLocalFilters
          );

          // Reset dependent filter if current value is no longer valid
          const currentValue = updatedLocalFilters[filterItem.id];
          const isCurrentValueValid = newFilteredOptions.some(
            (option) =>
              option.value === currentValue ||
              option.id === currentValue ||
              (Array.isArray(currentValue) &&
                currentValue.some(
                  (val) => option.value === val || option.id === val
                ))
          );

          if (currentValue && !isCurrentValueValid) {
            updatedLocalFilters[filterItem.id] =
              filterItem.inputType === "multiSelect" ? [] : "";
            // Remove the filter from parent state
            removeFilter(filterItem.id);
          }
        }
      });

      setLocalFilters(updatedLocalFilters);

      // Handle the original filter logic
      if (
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" &&
          value !== null &&
          Object.values(value).every(
            (v) => v === "" || v === null || v === undefined
          )) ||
        value === undefined ||
        value === null
      ) {
        removeFilter(filterId);
      } else {
        setFilter(filterId, value, operator, nestedArrayField);
      }
    },
    [setFilter, removeFilter, localFilters, filterConfig]
  );

  // Helper function to get filtered options for a specific field (used in reset logic)
  const getFilteredOptionsForField = useCallback(
    (filterItem, currentFilters) => {
      // Handle legacy single filter
      if (filterItem.filter && !filterItem.filters) {
        const dependentFieldName = filterItem.filter.dependentField;
        const key = filterItem.filter.key;
        const dependentValue =
          currentFilters[dependentFieldName]?.value ||
          currentFilters[dependentFieldName];

        if (!dependentValue) {
          return filterItem.options || [];
        }

        return (filterItem.options || []).filter((option) => {
          if (key) {
            return option?.[dependentFieldName]?.[key] === dependentValue;
          }
          return option?.[dependentFieldName] === dependentValue;
        });
      }

      // Handle multiple filters
      if (filterItem.filters && filterItem.filters.length > 0) {
        let filteredOptions = filterItem.options || [];

        filterItem.filters.forEach((filter) => {
          const dependentFieldName = filter.dependentField;
          const key = filter.key;
          const valueToMatch =
            currentFilters[dependentFieldName]?.value ||
            currentFilters[dependentFieldName];

          if (valueToMatch) {
            filteredOptions = filteredOptions.filter((option) => {
              if (key) {
                return option?.[dependentFieldName]?.[key] === valueToMatch;
              }
              return option?.[dependentFieldName] === valueToMatch;
            });
          }
        });

        return filteredOptions;
      }

      return filterItem.options || [];
    },
    []
  );

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (filterId, field, value, currentValue, operator, nestedArrayField) => {
      const updatedValue = { ...currentValue, [field]: value };
      if (updatedValue.startDate || updatedValue.endDate) {
        handleFilterChange(filterId, updatedValue, operator, nestedArrayField);
      } else {
        removeFilter(filterId);
      }
    },
    [handleFilterChange, removeFilter]
  );

  // Handle clearing filters and closing the dialog
  const handleClearFilters = useCallback(() => {
    clearFilters();
    setLocalFilters({});
    setOpen(false);
  }, [clearFilters]);

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={hasFilters ? "default" : "outline"} size="sm">
            <Filter className="h-4 w-4" />
            {hasFilters && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                {Object.keys(filters).length}
              </span>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-xl max-h-[400px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter {title}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Global Filter */}
            {setGlobalFilter && (
              <div>
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search all columns..."
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {/* Individual Filters */}
            {filterConfig.map((filterItem) => {
              const currentFilter = localFilters[filterItem.id] || {};
              const currentValue = getCurrentValue(filterItem, currentFilter);
              const operator =
                currentFilter?.operator ||
                DEFAULT_OPERATORS[filterItem.inputType];

              // Get filtered options for this filter item
              const availableOptions = getFilteredOptions(filterItem);

              return (
                <div key={filterItem.id}>
                  <label className="text-sm font-medium">
                    {filterItem.label}
                  </label>

                  {filterItem.inputType === "select" && (
                    <MultiSelect
                      options={availableOptions}
                      value={currentValue}
                      onValueChange={(value) =>
                        handleFilterChange(filterItem.id, value, operator)
                      }
                      placeholder={`Select ${filterItem.label}...`}
                      className="mt-1"
                      multiSelect={false}
                    />
                  )}

                  {filterItem.inputType === "multiSelect" && (
                    <MultiSelect
                      options={availableOptions}
                      value={currentValue}
                      onValueChange={(value) =>
                        handleFilterChange(filterItem.id, value, operator)
                      }
                      placeholder={`Select ${filterItem.label}...`}
                      className="mt-1"
                      multiSelect={true}
                    />
                  )}

                  {filterItem.inputType === "text" && (
                    <Input
                      placeholder={`Filter by ${filterItem.label}...`}
                      value={currentValue}
                      onChange={(e) =>
                        handleFilterChange(
                          filterItem.id,
                          e.target.value,
                          operator
                        )
                      }
                      className="mt-1"
                    />
                  )}

                  {filterItem.inputType === "dateRange" && (
                    <div className="flex flex-col space-y-2 mt-1">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="date"
                          value={currentValue.startDate || ""}
                          placeholder="Start date"
                          onChange={(e) =>
                            handleDateRangeChange(
                              filterItem.id,
                              "startDate",
                              e.target.value,
                              currentValue,
                              OPERATORS.DATE_RANGE
                            )
                          }
                          className="flex-1"
                        />
                        <span className="text-sm">to</span>
                        <Input
                          type="date"
                          value={currentValue.endDate || ""}
                          placeholder="End date"
                          onChange={(e) =>
                            handleDateRangeChange(
                              filterItem.id,
                              "endDate",
                              e.target.value,
                              currentValue,
                              OPERATORS.DATE_RANGE
                            )
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleClearFilters}>
              Clear All
            </Button>
            <Button onClick={() => setOpen(false)}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
