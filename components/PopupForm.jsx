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
import usePopulateFormFields from "@/hooks/use-populate-form-fields";

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

/* ---------- FieldRenderer: simplified for direct rendering ---------- */
function FieldRenderer({ field, form, apiKey, data }) {
  const depName = field.conditionalRender?.dependentField;
  const depValue = useWatch({ control: form.control, name: depName });

  if (data && field.hideOnEdit) return null;

  if (field.conditionalRender) {
    const expected = field.conditionalRender.expectedValue;
    if (depValue !== expected) return null;
  }

  return (
    <FormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={field.className}>
          {field.label && !field.hideLabel && (
            <FormLabel htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            {field.inputType === "image" ? (
              <ImageUploader
                value={formField.value}
                onChange={(val) => formField.onChange(val)}
                disabled={field.disabled}
                apiKey={apiKey}
                maxFileSize={field.maxFileSize}
                allowedTypes={field.allowedTypes}
                minWidth={field.minWidth}
                minHeight={field.minHeight}
                maxWidth={field.maxWidth}
                maxHeight={field.maxHeight}
                aspectRatio={field.aspectRatio}
                readOnly={(data && field.readOnlyOnEdit) || field.readOnly}
              />
            ) : field.inputType === "select" ||
              field.inputType === "multiSelect" ? (
              <MultiSelect
                options={field.options || []}
                placeholder={field.placeholder || "Select options"}
                multiSelect={field.inputType === "multiSelect"}
                value={formField.value}
                onValueChange={(value) => formField.onChange(value)}
                variant={field.variant || "default"}
                maxCount={field.maxCount}
                disableSearch={field.disableSearch}
                freeSolo={field.freeSolo}
                showSelectedCount={field.showSelectedCount}
                readOnly={(data && field.readOnlyOnEdit) || field.readOnly}
                isLoading={field.isLoading}
              />
            ) : field.inputType === "range" ? (
              <RangeInput
                min={field.min}
                max={field.max}
                step={field.step}
                unit={field.unit}
                value={formField.value}
                onChange={(value) => formField.onChange(value)}
                disabled={field.disabled}
                variant={field.variant || "default"}
                type={field.type || "number"}
                placeholder={field.placeholder}
                fromLabel={field.fromLabel || "From"}
                toLabel={field.toLabel || "To"}
                className={field.className}
                readOnly={(data && field.readOnlyOnEdit) || field.readOnly}
                {...field.props}
              />
            ) : (
              <Input
                type={field.type || "text"}
                placeholder={field.placeholder}
                readOnly={(data && field.readOnlyOnEdit) || field.readOnly}
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

/* ---------- FormContent with Data Population ---------- */
const FormContent = ({
  form,
  formFields,
  handleSubmit,
  data,
  loading,
  apiKey,
}) => {
  const sectionRefs = React.useRef([]);
  const [dependentFilters, setDependentFilters] = React.useState({});
  const { populatedFormFields, isLoading: fieldsLoading } =
    usePopulateFormFields(formFields, apiKey, dependentFilters);

  // Watch for changes in dependent fields to trigger API refetches
  React.useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      const field = formFields.find((f) => f.name === name);
      if (field) {
        // Find fields that depend on the changed field
        formFields.forEach((dependentField) => {
          if (
            dependentField.filter &&
            dependentField.filter.dependentField === name
          ) {
            setDependentFilters((prev) => ({
              ...prev,
              [dependentField.resource]: {
                [dependentField.filter.key]: value[name],
              },
            }));
            // Reset the value of the dependent field
            form.setValue(dependentField.name, undefined);
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, formFields]);

  const sections = React.useMemo(() => {
    return populatedFormFields.reduce((acc, field) => {
      acc[field.section] = acc[field.section] || [];
      acc[field.section].push(field);
      return acc;
    }, {});
  }, [populatedFormFields]);

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
            <Button
              className="w-full"
              type="submit"
              disabled={loading || fieldsLoading}
            >
              {loading || fieldsLoading ? (
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
  }, [data, formFields]);

  const { schema } = useDynamicFormSchema(customFormFields);

  const defaultValues = React.useMemo(() => {
    return getDefaultValues(data, customFormFields);
  }, [data, customFormFields]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "all",
  });

  const handleSubmit = React.useCallback(async () => {
    try {
      const values = form.getValues();
      const success = await onSubmit(values);
      if (success) {
        setOpen(false);
        form.reset();
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
          key={data ? `edit-${data?._id}` : `create-${title}`}
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
