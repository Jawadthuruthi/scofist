"use client";
import useCrud from "@/hooks/use-crud";
import { formatOptions } from "@/lib/utils";

const usePopulateFormField = (field, apiKey, dependentValue) => {
  const { useFetchItems } = useCrud(field.resource, apiKey);
  const filters = field.apiFilters ? { ...field.apiFilters } : {};
  if (field.filter && dependentValue) {
    filters[field.filter.key] = dependentValue;
  }

  // Only fetch if resource matches logical condition (truthy)
  const shouldFetch = !!field.resource;

  const { data: fetched, isLoading } = useFetchItems(0, Infinity, filters, {
    enabled: shouldFetch,
  });

  const items = fetched?.[field.resource] || fetched?.data || [];
  const options = formatOptions(items, field.labelKey, field.valueKey);

  // If resource is users and we are fetching students, sort them numerically by admission number / ID
  if (field.resource === "users" && field.apiFilters?.roles?.includes("Student")) {
    options.sort((a, b) => {
      // Use admissionNumber if available, otherwise fallback to the option value (usually _id)
      const admA = a.studentSpecificField?.admissionNumber || a.value;
      const admB = b.studentSpecificField?.admissionNumber || b.value;
      
      const valA = String(admA);
      const valB = String(admB);
      
      // Extract numerical part for numeric comparison
      const numA = parseInt(valA.replace(/\D/g, ''), 10);
      const numB = parseInt(valB.replace(/\D/g, ''), 10);
      
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB; // Ascending order
      }
      
      // Fallback to alphanumeric comparison if numeric parts are equal or missing
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  // If no resource, we likely don't want to override options unless we handle mixed cases, 
  // but for this specific hook's purpose (populate form field), it implies resource-based population.
  // If no resource, just return field usage?
  // The caller (PopupForm) used to switch: resource ? usePopulate... : field.
  // So if no resource, we should logically return 'field' but with existing options intact.

  if (!field.resource) return field;

  return {
    ...field,
    options,
    isLoading,
  };
};

export default usePopulateFormField;
