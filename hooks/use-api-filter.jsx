// hooks/use-api-filtering.js
import { useState, useCallback } from "react";
import { debounce } from "lodash";

export function useApiFiltering(initialFilters = {}, debounceTime = 300) {
  const [apiFilters, setApiFilters] = useState(initialFilters);
  const [isRefetching, setIsRefetching] = useState(false);

  const updateFilter = useCallback((field, value) => {
    setApiFilters((prev) => {
      const newFilters = { ...prev };
      if (value === undefined || value === null || value === "") {
        delete newFilters[field];
      } else {
        newFilters[field] = value;
      }
      return newFilters;
    });
    setIsRefetching(true);
  }, []);

  const debouncedUpdateFilter = useCallback(
    debounce((field, value) => updateFilter(field, value), debounceTime),
    [updateFilter, debounceTime]
  );

  const clearFilters = useCallback(() => {
    setApiFilters({});
    setIsRefetching(true);
  }, []);

  const bulkUpdateFilters = useCallback((filterObject) => {
    setApiFilters(filterObject);
    setIsRefetching(true);
  }, []);

  return {
    apiFilters,
    updateFilter,
    debouncedUpdateFilter,
    clearFilters,
    bulkUpdateFilters,
    isRefetching,
    setIsRefetching,
  };
}
