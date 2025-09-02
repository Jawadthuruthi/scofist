"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit, Loader, Plus } from "lucide-react";
import { MultiSelect } from "./ui/multi-select";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useDynamicFormSchema } from "@/hooks/use-dynamic-form-schema";
import { getDefaultValues } from "@/lib/utils";
import ImageUploader from "./ImageUploader";
import { Progress } from "@/components/ui/progress";
import RangeInput from "./RangeInput";

/* ---------- SectionNavigation (unchanged) ---------- */
const SectionNavigation = ({
  ref,
  sectionOrder,
  activeIndex,
  setActiveIndex,
}) => (
  <div className="flex mb-4 border-b max-w-full overflow-x-auto hide-scrollbar">
    {sectionOrder.map((section, index) => (
      <button
        ref={(el) => (ref.current[index] = el)}
        key={section}
        type="button"
        className={`px-4 py-2 text-sm text-nowrap ${
          activeIndex === index
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        }`}
        onClick={() => setActiveIndex(index)}
      >
        {section}
      </button>
    ))}
  </div>
);

/* ---------- FieldRenderer: isolated watcher + stable options ---------- */
function FieldRenderer({ field, form, apiKey, data }) {
  // 1) Hooks always run in the same order (important)
  const depName =
    field.conditionalRender?.dependentField || field.filter?.dependentField;
  const depValue = useWatch({ control: form.control, name: depName }); // hook 1
  const thisValue = useWatch({ control: form.control, name: field.name }); // hook 2

  // Watch multiple dependent fields for filters array
  const multipleFilters = field.filters || (field.filter ? [field.filter] : []);
  const watchedValues = {};

  // Watch all dependent fields (hook 3 - but called consistently)
  multipleFilters.forEach((filter) => {
    if (filter.dependentField) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      watchedValues[filter.dependentField] = useWatch({
        control: form.control,
        name: filter.dependentField,
      });
    }
  });

  // compute mergedOptions in a useMemo (hook 4)
  const mergedOptions = React.useMemo(() => {
    // Handle legacy single filter
    if (field.filter && !field.filters) {
      const dependentFieldName = field.filter.dependentField;
      const key = field.filter.key;
      const fallbackKey = field.filter.fallbackKey;
      const valueToMatch = depValue;

      const filteredOptions = (field.options || []).filter((option) => {
        if (!valueToMatch) return true;
        if (key) {
          return option?.[dependentFieldName]?.[key] === valueToMatch;
        }
        return option?.[dependentFieldName] === valueToMatch;
      });

      const selectedOptions = (field.options || []).filter((option) =>
        Array.isArray(thisValue)
          ? thisValue.includes(option.value)
          : thisValue === option.value
      );

      return [
        ...filteredOptions,
        ...selectedOptions.filter(
          (opt) => !filteredOptions.some((f) => f.value === opt.value)
        ),
      ];
    }

    // Handle multiple filters
    if (field.filters && field.filters.length > 0) {
      let filteredOptions = field.options || [];

      // Apply each filter sequentially
      field.filters.forEach((filter) => {
        const dependentFieldName = filter.dependentField;
        const key = filter.key;
        const valueToMatch = watchedValues[dependentFieldName];

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
      const selectedOptions = (field.options || []).filter((option) =>
        Array.isArray(thisValue)
          ? thisValue.includes(option.value)
          : thisValue === option.value
      );

      return [
        ...filteredOptions,
        ...selectedOptions.filter(
          (opt) => !filteredOptions.some((f) => f.value === opt.value)
        ),
      ];
    }

    // No filters - return all options
    return field.options ?? [];
  }, [
    field.options,
    field.filter,
    field.filters,
    depValue,
    thisValue,
    watchedValues,
    field.filter?.key,
    field.filter?.dependentField,
  ]);

  // keep stable reference for options (hook 5)
  const stableRef = React.useRef(mergedOptions);

  // update stableRef in an effect (hook 6)
  React.useEffect(() => {
    const prev = stableRef.current;
    if (!Array.isArray(prev) || prev.length !== mergedOptions.length) {
      stableRef.current = mergedOptions;
      return;
    }
    const same = prev.every((p, i) => p?.value === mergedOptions[i]?.value);
    if (!same) stableRef.current = mergedOptions;
    // if same, keep previous reference (stability)
  }, [mergedOptions]);

  const stableOptions =
    field.filter || field.filters ? mergedOptions : stableRef.current;

  // 2) Now that all hooks ran, we can early-return for hidden fields
  if (data && field.hideOnEdit) return null;

  if (field.conditionalRender) {
    const expected = field.conditionalRender.expectedValue;
    if (depValue !== expected) return null;
  }

  // 3) Determine field object to render (preserve identity where possible)
  const sameOptions =
    Array.isArray(field.options) &&
    Array.isArray(stableOptions) &&
    field.options.length === stableOptions.length &&
    field.options.every((o, i) => o?.value === stableOptions[i]?.value);

  const fieldToRender = sameOptions
    ? field
    : { ...field, options: stableOptions };

  // 4) Render (unchanged)
  return (
    <FormField
      control={form.control}
      name={fieldToRender.name}
      render={({ field: formField }) => (
        <FormItem className={fieldToRender.className}>
          {fieldToRender.label && !fieldToRender.hideLabel && (
            <FormLabel htmlFor={fieldToRender.name}>
              {fieldToRender.label}
              {fieldToRender.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </FormLabel>
          )}
          <FormControl>
            {fieldToRender.inputType === "image" ? (
              <ImageUploader
                value={formField.value}
                onChange={(val) => formField.onChange(val)}
                disabled={fieldToRender.disabled}
                apiKey={apiKey}
                maxFileSize={fieldToRender.maxFileSize}
                allowedTypes={fieldToRender.allowedTypes}
                minWidth={fieldToRender.minWidth}
                minHeight={fieldToRender.minHeight}
                maxWidth={fieldToRender.maxWidth}
                maxHeight={fieldToRender.maxHeight}
                aspectRatio={fieldToRender.aspectRatio}
                readOnly={
                  (data && fieldToRender.readOnlyOnEdit) ||
                  fieldToRender.readOnly
                }
              />
            ) : fieldToRender.inputType === "select" ||
              fieldToRender.inputType === "multiSelect" ? (
              <MultiSelect
                options={fieldToRender.options || []}
                placeholder={fieldToRender.placeholder || "Select options"}
                multiSelect={fieldToRender.inputType === "multiSelect"}
                value={formField.value}
                onValueChange={(value) => formField.onChange(value)}
                variant={fieldToRender.variant || "default"}
                maxCount={fieldToRender.maxCount}
                disableSearch={fieldToRender.disableSearch}
                freeSolo={fieldToRender.freeSolo}
                showSelectedCount={fieldToRender.showSelectedCount}
                readOnly={
                  (data && fieldToRender.readOnlyOnEdit) ||
                  fieldToRender.readOnly
                }
              />
            ) : fieldToRender.inputType === "range" ? (
              <RangeInput
                min={fieldToRender.min}
                max={fieldToRender.max}
                step={fieldToRender.step}
                unit={fieldToRender.unit}
                value={formField.value}
                onChange={(value) => formField.onChange(value)}
                disabled={fieldToRender.disabled}
                variant={fieldToRender.variant || "default"}
                type={fieldToRender.type || "number"}
                placeholder={fieldToRender.placeholder}
                fromLabel={fieldToRender.fromLabel || "From"}
                toLabel={fieldToRender.toLabel || "To"}
                className={fieldToRender.className}
                readOnly={
                  (data && fieldToRender.readOnlyOnEdit) ||
                  fieldToRender.readOnly
                }
                {...fieldToRender.props}
              />
            ) : (
              <Input
                type={fieldToRender.type || "text"}
                placeholder={fieldToRender.placeholder}
                readOnly={
                  (data && fieldToRender.readOnlyOnEdit) ||
                  fieldToRender.readOnly
                }
                {...formField}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* ---------- FormFields now renders FieldRenderer for each field ---------- */
const FormFields = ({ form, fields, apiKey, data }) =>
  fields.map((field, idx) => (
    <FieldRenderer
      key={field.name ?? idx}
      field={field}
      form={form}
      apiKey={apiKey}
      data={data}
    />
  ));

/* ---------- FormContent (unchanged) ---------- */
const FormContent = ({
  form,
  formFields,
  handleSubmit,
  data,
  loading,
  apiKey,
}) => {
  const sectionRefs = React.useRef([]);

  const sections = React.useMemo(() => {
    return formFields.reduce((acc, field) => {
      acc[field.section] = acc[field.section] || [];
      acc[field.section].push(field);
      return acc;
    }, {});
  }, [formFields]);

  const sectionOrder = Object.keys(sections);
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);
  const totalSections = sectionOrder.length;
  const progress = ((activeSectionIndex + 1) / totalSections) * 100;

  React.useEffect(() => {
    if (sectionRefs.current[activeSectionIndex]) {
      sectionRefs.current[activeSectionIndex].scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "end",
      });
    }
  }, [activeSectionIndex]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="max-w-full overflow-hidden"
      >
        {totalSections > 1 && (
          <div className="mb-4">
            <div className="flex mb-1 text-sm font-medium">
              <span>
                Step {activeSectionIndex + 1} of {totalSections}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        {totalSections > 1 && (
          <SectionNavigation
            ref={sectionRefs}
            sectionOrder={sectionOrder}
            activeIndex={activeSectionIndex}
            setActiveIndex={setActiveSectionIndex}
          />
        )}
        <div className="max-h-[60vh] overflow-y-auto px-2">
          {sectionOrder.map((section, index) => (
            <div
              key={section}
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${activeSectionIndex === index ? "block" : "hidden"}`}
            >
              {section !== "undefined" && (
                <h2 className="text-lg font-bold md:col-span-2">{section}</h2>
              )}
              <FormFields
                form={form}
                fields={sections[section]}
                apiKey={apiKey}
                data={data}
              />
            </div>
          ))}
        </div>
        <div className="flex w-full gap-3 mt-8">
          {activeSectionIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-1/2"
              onClick={() => setActiveSectionIndex((prev) => prev - 1)}
            >
              Previous
            </Button>
          )}
          {activeSectionIndex === totalSections - 1 ? (
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <Loader className="animate-spin mr-2" />
              ) : (
                "Save changes"
              )}
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                setActiveSectionIndex((prev) => prev + 1);
              }}
            >
              Next
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

/* ---------- PopupForm (main) ---------- */
export default function PopupForm({
  data = null,
  formFields = [],
  onSubmit,
  title = "",
  description = "",
  loading = false,
  apiKey,
  hideButton = false,
}) {
  const [open, setOpen] = React.useState(false);

  const customFormFields = React.useMemo(() => {
    if (data) {
      return formFields.filter((field) => !field.hideOnEdit);
    } else {
      return formFields;
    }
  });

  // keep your existing dynamic schema hook if you want
  const { schema } = useDynamicFormSchema(customFormFields);

  const defaultValues = React.useMemo(() => {
    return getDefaultValues(data, customFormFields);
  }, [data, customFormFields, schema]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "all",
  });

  const {
    formState: { errors },
  } = form;

  React.useEffect(() => {
    console.log(errors);
  }, [errors]);

  const handleSubmit = React.useCallback(async () => {
    try {
      const values = form.getValues();
      const success = await onSubmit(values);
      if (success) {
        setOpen(false);
      }
    } catch (error) {
      console.error("Form submission failed:", error.message);
      if (error.details?.errors) {
        error.details.errors.forEach(({ field, message }) => {
          const fieldLabel =
            customFormFields?.find((f) => f.name === field)?.label ||
            "This value";
          form.setError(field, {
            type: "manual",
            message: `${fieldLabel} ${message}`,
          });
        });

        return;
      }
    }
  }, [form, customFormFields, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {!hideButton && (
          <Button variant="outline">
            {data ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <FormContent
          key={data ? `edit-${data?._id}` : `create ${title}`}
          form={form}
          formFields={customFormFields}
          handleSubmit={handleSubmit}
          data={data}
          loading={loading}
          apiKey={apiKey}
        />
      </DialogContent>
    </Dialog>
  );
}
