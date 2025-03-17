import { useState, useMemo, useCallback } from "react";

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

/**
 * Custom hook for filtering initialData collections with support for multiple operators
 *
 * @param {Array} initialData - The original initialData array to filter
 * @param {Object} initialFilters - Optional initial filter criteria
 * @returns {Object} Filtering utilities and filtered initialData
 */
export function useDataFilter(initialData = [], initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [globalFilter, setGlobalFilter] = useState("");

  /**
   * Updates a specific filter field with value and operator
   *
   * @param {string} field - The field name to filter by
   * @param {any} value - The filter value
   * @param {string} operator - The filter operator (equals, contains, includes, etc.)
   */
  const setFilter = useCallback(
    (field, value, operator = OPERATORS.CONTAINS) => {
      setFilters((prevFilters) => ({
        ...prevFilters,
        [field]: { value, operator },
      }));
    },
    []
  );

  /**
   * Removes a filter from the current filters
   *
   * @param {string} field - The field name to remove filtering for
   */
  const removeFilter = useCallback((field) => {
    setFilters((prevFilters) => {
      const newFilters = { ...prevFilters };
      delete newFilters[field];
      return newFilters;
    });
  }, []);

  /**
   * Clears all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
    setGlobalFilter("");
  }, []);

  /**
   * Applies operator-based filtering
   *
   * @param {any} value - The field value
   * @param {any} filterValue - The filter value
   * @param {string} operator - The operator to use
   * @returns {boolean} Whether the value passes the filter condition
   */
  const applyOperator = useCallback((value, filterValue, operator) => {
    // Handle null or undefined values
    if (value === null || value === undefined) {
      // Special handling for null/empty operators
      if (operator === OPERATORS.IS_NULL) return true;
      if (operator === OPERATORS.IS_NOT_NULL) return false;
      if (operator === OPERATORS.IS_EMPTY) return true;
      if (operator === OPERATORS.IS_NOT_EMPTY) return false;

      return (
        filterValue === null || filterValue === undefined || filterValue === ""
      );
    }

    // Special handling for empty/null operators when value is not null
    if (operator === OPERATORS.IS_NULL) return false;
    if (operator === OPERATORS.IS_NOT_NULL) return true;
    if (operator === OPERATORS.IS_EMPTY) {
      if (typeof value === "string") return value.trim() === "";
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === "object") return Object.keys(value).length === 0;
      return false;
    }
    if (operator === OPERATORS.IS_NOT_EMPTY) {
      if (typeof value === "string") return value.trim() !== "";
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    }

    // Convert to string for string-based operations
    const strValue = String(value).toLowerCase();

    // Handle non-string filterValues
    if (filterValue === null || filterValue === undefined) {
      return false;
    }

    // String operations
    if (typeof filterValue === "string") {
      const strFilterValue = filterValue.toLowerCase();

      switch (operator) {
        case OPERATORS.EQUALS:
          return strValue === strFilterValue;

        case OPERATORS.NOT_EQUALS:
          return strValue !== strFilterValue;

        case OPERATORS.CONTAINS:
          return strValue.includes(strFilterValue);

        case OPERATORS.NOT_CONTAINS:
          return !strValue.includes(strFilterValue);

        case OPERATORS.STARTS_WITH:
          return strValue.startsWith(strFilterValue);

        case OPERATORS.ENDS_WITH:
          return strValue.endsWith(strFilterValue);

        case OPERATORS.REGEX:
          try {
            const regex = new RegExp(filterValue);
            return regex.test(value);
          } catch (error) {
            console.error("Invalid regex pattern:", error);
            return false;
          }
      }
    }

    // Numeric operations
    if (
      typeof filterValue === "number" ||
      (typeof filterValue === "string" && !isNaN(Number(filterValue)))
    ) {
      const numValue = Number(value);
      const numFilterValue = Number(filterValue);

      if (isNaN(numValue)) return false;

      switch (operator) {
        case OPERATORS.EQUALS:
          return numValue === numFilterValue;

        case OPERATORS.NOT_EQUALS:
          return numValue !== numFilterValue;

        case OPERATORS.GREATER_THAN:
          return numValue > numFilterValue;

        case OPERATORS.LESS_THAN:
          return numValue < numFilterValue;

        case OPERATORS.GREATER_THAN_OR_EQUAL:
          return numValue >= numFilterValue;

        case OPERATORS.LESS_THAN_OR_EQUAL:
          return numValue <= numFilterValue;
      }
    }

    // Array operations
    if (Array.isArray(filterValue)) {
      switch (operator) {
        case OPERATORS.INCLUDES:
          if (Array.isArray(value)) {
            return filterValue.some((fv) =>
              value.some((v) =>
                String(v).toLowerCase().includes(String(fv).toLowerCase())
              )
            );
          }
          return filterValue.some((fv) =>
            String(value).toLowerCase().includes(String(fv).toLowerCase())
          );

        case OPERATORS.EXCLUDES:
          if (Array.isArray(value)) {
            return !filterValue.some((fv) =>
              value.some((v) =>
                String(v).toLowerCase().includes(String(fv).toLowerCase())
              )
            );
          }
          return !filterValue.some((fv) =>
            String(value).toLowerCase().includes(String(fv).toLowerCase())
          );

        case OPERATORS.EQUALS:
          if (Array.isArray(value)) {
            // Check if arrays have same elements (order independent)
            return (
              filterValue.length === value.length &&
              filterValue.every((fv) =>
                value.some(
                  (v) => String(v).toLowerCase() === String(fv).toLowerCase()
                )
              )
            );
          }
          return false;
      }
    }

    // Range operations
    if (
      filterValue &&
      typeof filterValue === "object" &&
      operator === OPERATORS.BETWEEN
    ) {
      const numValue = Number(value);
      if (isNaN(numValue)) return false;

      const min = Number(filterValue.min);
      const max = Number(filterValue.max);

      if (!isNaN(min) && !isNaN(max)) {
        return numValue >= min && numValue <= max;
      }
      if (!isNaN(min)) {
        return numValue >= min;
      }
      if (!isNaN(max)) {
        return numValue <= max;
      }
    }

    // Default case: try to do a simple equality check
    return strValue === String(filterValue).toLowerCase();
  }, []);

  /**
   * Checks if a value matches a filter condition with operator support
   *
   * @param {any} value - The value to check
   * @param {Object} filterConfig - The filter configuration { value, operator }
   * @returns {boolean} Whether the value matches the filter
   */
  const matchesFilter = useCallback(
    (value, filterConfig) => {
      // Support for both object-based filters with operators and legacy direct value filters
      const filterValue =
        filterConfig?.value !== undefined ? filterConfig.value : filterConfig;
      const operator = filterConfig?.operator || OPERATORS.CONTAINS;

      return applyOperator(value, filterValue, operator);
    },
    [applyOperator]
  );

  /**
   * Filter the initialData based on current filters
   */
  const filteredData = useMemo(() => {
    if (!initialData || initialData.length === 0) return [];

    return initialData.filter((item) => {
      // Apply field-specific filters
      for (const [field, filterConfig] of Object.entries(filters)) {
        // Skip empty filters
        const filterValue =
          filterConfig?.value !== undefined ? filterConfig.value : filterConfig;
        const operator = filterConfig?.operator || OPERATORS.CONTAINS;

        // Skip null checks for operators that specifically work with null/empty
        if (
          [
            OPERATORS.IS_NULL,
            OPERATORS.IS_NOT_NULL,
            OPERATORS.IS_EMPTY,
            OPERATORS.IS_NOT_EMPTY,
          ].includes(operator)
        ) {
          // These operators should be applied regardless of filterValue
        } else if (
          filterValue === undefined ||
          filterValue === null ||
          (Array.isArray(filterValue) && filterValue.length === 0)
        ) {
          // Skip other empty filters
          continue;
        }

        // Handle nested fields using dot notation (e.g., "user.name")
        const fieldParts = field.split(".");
        let value = item;

        for (const part of fieldParts) {
          if (value === null || value === undefined) {
            return false;
          }
          value = value[part];
        }

        if (!matchesFilter(value, filterConfig)) {
          return false;
        }
      }

      // Apply global filter across all fields if specified
      if (globalFilter) {
        const globalFilterLower = globalFilter.toLowerCase();

        // Check if any field in the item contains the global filter value
        return Object.values(item).some((value) => {
          if (value === null || value === undefined) return false;

          if (typeof value === "object") {
            // For objects, convert to string for simple filtering
            return JSON.stringify(value)
              .toLowerCase()
              .includes(globalFilterLower);
          }

          return String(value).toLowerCase().includes(globalFilterLower);
        });
      }

      return true;
    });
  }, [initialData, filters, globalFilter, matchesFilter]);

  return {
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    globalFilter,
    setGlobalFilter,
    filteredData,
    hasFilters: Object.keys(filters).length > 0 || globalFilter !== "",
    OPERATORS,
  };
}
