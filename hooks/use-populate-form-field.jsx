"use client";
import useCrud from "@/hooks/use-crud";
import { formatOptions } from "@/lib/utils";

const usePopulateFormField = (field, apiKey, dependentValue) => {
  const { useFetchItems } = useCrud(field.resource, apiKey);
  const filters = {};
  if (field.filter && dependentValue) {
    filters[field.filter.key] = dependentValue;
  }
  const { data: fetched, isLoading } = useFetchItems(0, Infinity, filters);
  const items = fetched?.[field.resource] || [];
  const options = formatOptions(items, field.labelKey, field.valueKey);

  return {
    ...field,
    options,
    isLoading,
  };
};

export default usePopulateFormField;
