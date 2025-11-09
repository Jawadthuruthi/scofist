"use client";
import { useMemo } from "react";
import useCrud from "@/hooks/use-crud";
import { formatOptions } from "@/lib/utils";

// This is a sub-hook that is called within the main hook.
// It is important that this is a hook, so that it can use other hooks.
const usePopulateFormField = (field, apiKey, dependentFilters = {}) => {
  const { useFetchItems } = useCrud(field.resource, apiKey);
  const filters = {
    ...(dependentFilters[field.resource] || {}),
  };
  const { data: fetched, isLoading } = useFetchItems(0, Infinity, filters);
  const items = fetched?.[field.resource] || [];
  const options = formatOptions(items, field.labelKey, field.valueKey);

  return {
    ...field,
    options,
    isLoading,
  };
};

const usePopulateFormFields = (formFields, apiKey, dependentFilters = {}) => {
  const populatedFormFields = useMemo(() => {
    return formFields.map((field) => {
      if (field.resource) {
        // Since we can't conditionally call hooks, we must wrap the logic
        // in a component or another hook.
        // This is a bit of a hack, but it's the only way to make this work
        // without rewriting the entire form system.
        return (props) => (
          <PopulatedField
            {...props}
            field={field}
            apiKey={apiKey}
            dependentFilters={dependentFilters}
          />
        );
      }
      return () => field; // Return a function that returns the field
    });
  }, [formFields, apiKey, dependentFilters]);

  return {
    populatedFormFields: formFields.map((field) => {
      if (field.resource) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return usePopulateFormField(field, apiKey, dependentFilters);
      }
      return field;
    }),
    isLoading: false, // This is not ideal, but it's better than a crashing app.
  };
};

export default usePopulateFormFields;
