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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit, Loader, Plus, X } from "lucide-react";
import { MultiSelect } from "./ui/multi-select";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useDynamicFormSchema } from "@/hooks/use-dynamic-form-schema";
import { getDefaultValues, cn } from "@/lib/utils";
import ImageUploader from "./ImageUploader";
import { Progress } from "@/components/ui/progress";
import RangeInput from "./RangeInput";
import usePopulateFormField from "@/hooks/use-populate-form-field";
import { toast } from "sonner";
import { ScanBarcode } from "lucide-react";
import ColorInput from "./ColorInput";
import BarcodeScannerModal from "./BarcodeScannerModal";

/* ---------- AsyncInput Component ---------- */
const AsyncInput = ({
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  autoFocus,
  asyncProps = {},
  ...props
}) => {
  const [preview, setPreview] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      // Basic validation to avoid spamming
      if (!value || String(value).length < 2) {
        setPreview(null);
        return;
      }

      setLoading(true);
      try {
        const { endpoint, queryKey = "_id", displayKey = "name", responseKey = "data", ...fetchOptions } = asyncProps;
        // Construct query correctly
        let url = `${endpoint}?${queryKey}=${encodeURIComponent(value)}`;
        if (displayKey) {
          url += `&projection=${displayKey}`;
        }

        const res = await fetch(url, { ...fetchOptions, credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          // Try to find the list in responseKey or known fallbacks
          const list = json[responseKey] || json.data || json.users || [];
          const item = Array.isArray(list) && list.length > 0 ? list[0] : null;

          if (item) {
            setPreview(item[displayKey] || "Unknown");
          } else {
            setPreview("Not found");
          }
        } else {
          setPreview("Error fetching data");
        }
      } catch (err) {
        console.error(err);
        setPreview("Error");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, asyncProps]);

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        {...props}
      />
      {loading && <div className="text-xs text-muted-foreground animate-pulse">Checking...</div>}
      {!loading && preview && (
        <div className={`text-xs ${preview === "Not found" || preview.startsWith("Error") ? "text-destructive" : "text-green-600 font-medium"}`}>
          {preview}
        </div>
      )}
    </div>
  );
};

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
        className={`px-4 py-2 text-sm text-nowrap ${activeIndex === index
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

// New component to render a single field and handle data population
const PopulatedField = ({ field, form, apiKey, data, capitalizeInputs }) => {
  const dependentValue = field.filter?.dependentField
    ? useWatch({ control: form.control, name: field.filter.dependentField })
    : null;

  const populatedField = usePopulateFormField(field, apiKey, dependentValue);

  return <FieldRenderer field={populatedField} form={form} apiKey={apiKey} data={data} capitalizeInputs={capitalizeInputs} />;
};

/* ---------- FieldRenderer: simplified for direct rendering ---------- */
function FieldRenderer({ field, form, apiKey, data, capitalizeInputs }) {
  const depName =
    field.conditionalRender?.dependentField || field.filter?.dependentField;
  const depValue = useWatch({ control: form.control, name: depName || "__ignore_dep_watch__" });

  const isSelect = field.inputType === "select" || field.inputType === "multiSelect";
  const needsWatch = isSelect || !!field.getWarning;
  const thisValue = useWatch({
    control: form.control,
    name: needsWatch ? field.name : "__ignore_watch__"
  });

  // Auto-selection logic for fields like subjectTypeAssignments
  const autoSelectValue = useWatch({ control: form.control, name: field.autoSelectFrom || "__ignore_watch__" });
  const prevAutoSelectValue = React.useRef(autoSelectValue);

  React.useEffect(() => {
    // Only run if autoSelectFrom is defined and the source value changed
    if (field.autoSelectFrom && autoSelectValue && autoSelectValue !== prevAutoSelectValue.current) {
      const currentValues = Array.isArray(thisValue) ? thisValue : [];

      // Determine what to add
      const coreVal = `${autoSelectValue}:CORE`;
      const majorVal = `${autoSelectValue}:MAJOR`;

      // Determine what to remove (the previous class's assignments if any)
      let newValues = [...currentValues];
      if (prevAutoSelectValue.current) {
        const prevCore = `${prevAutoSelectValue.current}:CORE`;
        const prevMajor = `${prevAutoSelectValue.current}:MAJOR`;
        newValues = newValues.filter(v => v !== prevCore && v !== prevMajor);
      }

      // Add new ones if not present
      if (!newValues.includes(coreVal)) newValues.push(coreVal);
      if (!newValues.includes(majorVal)) newValues.push(majorVal);

      form.setValue(field.name, newValues, { shouldDirty: true });
      prevAutoSelectValue.current = autoSelectValue;
    }
  }, [autoSelectValue, field.autoSelectFrom, field.name, form, thisValue]);

  const watchedValues = {};
  const multipleFilters = field.filters || (field.filter ? [field.filter] : []);
  multipleFilters.forEach((filter) => {
    if (filter.dependentField) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      watchedValues[filter.dependentField] = useWatch({
        control: form.control,
        name: filter.dependentField,
      });
    }
  });

  const mergedOptions = React.useMemo(() => {
    if (!field.resource) { // Only apply client-side filtering if not using a resource
      if (field.filter && !field.filters) {
        const dependentFieldName = field.filter.dependentField;
        const key = field.filter.key;
        const valueToMatch = depValue;
        const filteredOptions = (field.options || []).filter((option) => {
          if (!valueToMatch) return true;
          const optionValue = key ? option?.[dependentFieldName]?.[key] : option?.[dependentFieldName];
          if (Array.isArray(optionValue)) {
            return optionValue.includes(valueToMatch);
          }
          return optionValue === valueToMatch;
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
      if (field.filters && field.filters.length > 0) {
        let filteredOptions = field.options || [];
        field.filters.forEach((filter) => {
          const dependentFieldName = filter.dependentField;
          const key = filter.key;
          const valueToMatch = watchedValues[dependentFieldName];
          if (valueToMatch) {
            filteredOptions = filteredOptions.filter((option) => {
              const optionValue = key ? option?.[dependentFieldName]?.[key] : option?.[dependentFieldName];
              if (Array.isArray(optionValue)) {
                return optionValue.includes(valueToMatch);
              }
              return optionValue === valueToMatch;
            });
          }
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
    }
    return field.options ?? [];
  }, [
    field.resource,
    field.options,
    field.filter,
    field.filters,
    depValue,
    thisValue,
    watchedValues,
  ]);

  const fieldToRender = { ...field, options: mergedOptions };


  const [showScanner, setShowScanner] = React.useState(false);

  const handleScanFinish = (result) => {
    form.setValue(fieldToRender.name, result, { shouldDirty: true, shouldValidate: true });
    setShowScanner(false);
  };

  if (data?._id && field.hideOnEdit) return null;

  if (field.conditionalRender) {
    const expected = field.conditionalRender.expectedValue;
    if (expected !== undefined) {
      if (depValue !== expected) return null;
    } else {
      if (!depValue) return null;
    }
  }

  return (
    <FormField
      control={form.control}
      name={fieldToRender.name}
      render={({ field: formField }) => (
        <FormItem className={cn("min-w-0", fieldToRender.className || "col-span-3 md:col-span-1")}>
          {fieldToRender.label && !fieldToRender.hideLabel && (
            <FormLabel htmlFor={fieldToRender.name}>
              {fieldToRender.label}
              {fieldToRender.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <div className="flex gap-2 items-start w-full min-w-0">
              <div className="flex-1 min-w-0">
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
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
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
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    isLoading={fieldToRender.isLoading}
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
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    {...fieldToRender.props}
                  />
                ) : fieldToRender.inputType === "color" ? (
                  <ColorInput
                    disabled={fieldToRender.disabled}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    {...fieldToRender.props}
                    {...formField}
                  />
                ) : fieldToRender.inputType === "async-text" ? (
                  <AsyncInput
                    placeholder={fieldToRender.placeholder}
                    disabled={fieldToRender.disabled}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    asyncProps={fieldToRender.asyncProps}
                    autoFocus={fieldToRender.autoFocus}
                    className={capitalizeInputs && fieldToRender.name !== "email" ? "uppercase" : ""}
                    {...formField}
                    {...(capitalizeInputs && fieldToRender.name !== "email" && fieldToRender.type !== "email" ? {
                      value: typeof formField.value === "string" ? formField.value.toUpperCase() : formField.value,
                      onChange: (e) => {
                        if (e && e.target) {
                          const target = e.target;
                          const val = target.value;
                          if (typeof val === "string") {
                            const start = target.selectionStart;
                            const end = target.selectionEnd;
                            formField.onChange(val.toUpperCase());
                            requestAnimationFrame(() => {
                              if (target && target.setSelectionRange && start !== null) {
                                target.setSelectionRange(start, end);
                              }
                            });
                          } else {
                            formField.onChange(e);
                          }
                        } else {
                          if (typeof e === "string") {
                            formField.onChange(e.toUpperCase());
                          } else {
                            formField.onChange(e);
                          }
                        }
                      }
                    } : {})}
                  />
                ) : (
                  <Input
                    {...formField}
                    value={formField.value ?? ""}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (fieldToRender.type === "number") {
                        val = val === "" ? "" : Number(val);
                      } else if (
                        typeof val === "string" &&
                        capitalizeInputs &&
                        fieldToRender.name !== "email" &&
                        fieldToRender.type !== "email"
                      ) {
                        val = val.toUpperCase();
                      }
                      formField.onChange(val);
                    }}
                    type={fieldToRender.type || "text"}
                    placeholder={fieldToRender.placeholder}
                    disabled={fieldToRender.disabled}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    autoFocus={fieldToRender.autoFocus}
                    className={cn(
                      capitalizeInputs && fieldToRender.name !== "email" ? "uppercase" : "",
                      ((data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly) && "bg-muted/50 cursor-not-allowed text-muted-foreground focus-visible:ring-0"
                    )}
                  />
                )}
              </div>
              {fieldToRender.enableScanner && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-10 w-10 bg-foreground text-background hover:bg-foreground/90 border-none"
                    title="Scan Barcode"
                    onClick={() => setShowScanner(true)}
                  >
                    <ScanBarcode className="h-5 w-5" />
                  </Button>
                  <BarcodeScannerModal
                    open={showScanner}
                    onOpenChange={setShowScanner}
                    title={`Scan Barcode (${fieldToRender.label})`}
                    description={`Scan a barcode to automatically fill the ${fieldToRender.label} field.`}
                    onScan={handleScanFinish}
                    onClose={() => setShowScanner(false)}
                  />
                </>
              )}
            </div>
          </FormControl>
          {fieldToRender.getWarning && fieldToRender.getWarning(thisValue) && (
            <p className="text-[13px] font-bold text-red-500 mt-1.5">
              {fieldToRender.getWarning(thisValue)}
            </p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const FormFields = ({ form, fields, apiKey, data, capitalizeInputs }) =>
  fields.map((field, idx) => (
    <PopulatedField
      key={field.name ?? idx}
      field={field}
      form={form}
      apiKey={apiKey}
      data={data}
      capitalizeInputs={capitalizeInputs}
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
  submitButtonClass,
  buttonContainerClass,
  capitalizeInputs,
}) => {
  const sectionRefs = React.useRef([]);

  const sections = React.useMemo(() => {
    return formFields.reduce((acc, field) => {
      acc[field.section] = acc[field.section] || [];
      acc[field.section].push(field);
      return acc;
    }, {});
  }, [formFields]);

  const sectionOrder = React.useMemo(() => Object.keys(sections), [sections]);
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



  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
        return;
      }
      e.preventDefault();
      const formElement = e.currentTarget;
      const focusableElements = Array.from(
        formElement.querySelectorAll(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null); // Ensure element is visible

      const index = focusableElements.indexOf(e.target);
      if (index > -1 && index < focusableElements.length - 1) {
        focusableElements[index + 1].focus();
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onKeyDown={handleKeyDown}
        onSubmit={form.handleSubmit(
          (validatedValues) => {
            const warnings = [];
            formFields.forEach(field => {
              if (field.getWarning) {
                const msg = field.getWarning(validatedValues[field.name]);
                if (msg) warnings.push(`${field.label || field.name}: ${msg}`);
              }
            });
            if (warnings.length > 0) {
              toast.error(`Cannot submit. Please fix errors: ${warnings.join(", ")}`);
              return;
            }
            handleSubmit(validatedValues);
          },
          (errors) => {
            console.warn("DEBUG: Full Validation Errors (Stringify):", JSON.stringify(errors, (key, val) => key === 'ref' ? undefined : val, 2));
            // Format for easy reading
            const formattedErrors = Object.entries(errors).reduce((acc, [key, err]) => {
              acc[key] = err?.message || (typeof err === "string" ? err : "Invalid value");
              return acc;
            }, {});
            console.warn("Formatted Validation Errors:", formattedErrors);
            const errorMessages = Object.values(formattedErrors).join(", ");
            toast.error(`Please fill all required fields correctly. Errors: ${errorMessages}`);
          }
        )}
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
        <div className="px-2">
          {sectionOrder.map((section, index) => (
            <div
              key={section}
              className={`${activeSectionIndex === index ? "block" : "hidden"}`}
            >
              {section !== "undefined" && (
                <h2 className="text-lg font-bold mb-4">{section}</h2>
              )}

              {section === "Personal Details" ? (
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <FormFields
                      form={form}
                      fields={sections[section].filter(f => f.className?.includes("col-start-1") || !f.className?.includes("col-start-2"))}
                      apiKey={apiKey}
                      data={data}
                      capitalizeInputs={capitalizeInputs}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <FormFields
                      form={form}
                      fields={sections[section].filter(f => f.className?.includes("col-start-2"))}
                      apiKey={apiKey}
                      data={data}
                      capitalizeInputs={capitalizeInputs}
                    />
                    {/* Navigation buttons inline with last input */}
                    <div className={`flex items-end gap-2 mt-auto ${buttonContainerClass || "w-full"}`}>
                      {activeSectionIndex > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-10"
                          onClick={() => setActiveSectionIndex((prev) => prev - 1)}
                        >
                          Previous
                        </Button>
                      )}
                      {activeSectionIndex === totalSections - 1 ? (
                        <Button
                          className={submitButtonClass || "flex-1 h-10"}
                          type="submit"
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader className="animate-spin mr-2" />
                          ) : (
                            <>
                              <span>Save</span>
                              <span className="hidden sm:inline"> changes</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="flex-1 h-10"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveSectionIndex((prev) => prev + 1);
                          }}
                        >
                          Next
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`grid grid-cols-3 md:grid-cols-2 grid-flow-row-dense gap-4`}>
                  <FormFields
                    form={form}
                    fields={sections[section]}
                    apiKey={apiKey}
                    data={data}
                    capitalizeInputs={capitalizeInputs}
                  />
                  {/* Navigation buttons inline with last input */}
                  <div className={`flex items-end gap-2 ${buttonContainerClass || "col-span-3 md:col-span-1"}`}>
                    {activeSectionIndex > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-10"
                        onClick={() => setActiveSectionIndex((prev) => prev - 1)}
                      >
                        Previous
                      </Button>
                    )}
                    {activeSectionIndex === totalSections - 1 ? (
                      <Button
                        className={submitButtonClass || "flex-1 h-10"}
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader className="animate-spin mr-2" />
                        ) : (
                          <>
                            <span>Save</span>
                            <span className="hidden sm:inline"> changes</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="flex-1 h-10"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSectionIndex((prev) => prev + 1);
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </form>
    </Form>
  );
};

/* ---------- PopupForm (main) ---------- */
export default function PopupForm({
  title = "Form",
  description = "",
  formFields,
  data = null,
  onSubmit, // Expected to be an async function returning true on success
  hideButton = false,
  apiKey = null,
  loading: externalLoading = false,
  trigger = null,
  open: externalOpen,
  onOpenChange,
  className,
  submitButtonClass,
  triggerClass,
  triggerText,
  triggerVariant,
  buttonContainerClass,
  capitalizeInputs = false,
}) {
  // Use either external state (if provided) or internal state
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = isControlled ? externalOpen : internalOpen;
  const handleOpenChange = (newOpen) => {
    if (isControlled && onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const [loading, setLoading] = React.useState(false);
  const isSubmittingRef = React.useRef(false);
  const popupRef = React.useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `${title.replace(/\s+/g, '_')}_Form.jpeg`);

  // Custom form fields to handle object nesting
  const customFormFields = React.useMemo(() => {
    if (!formFields) return [];

    // Convert object values into appropriate structures for inputs
    if (data) {
      return formFields.map(field => {
        // Find if this field exists in the data as an object
        const value = data[field.name];

        let newField = { ...field };

        if (field.name === 'color') {
          newField.defaultValue = value || field.defaultValue || "#808080";
        } else if (value && typeof value === 'object' && !Array.isArray(value) &&
          ['select', 'async-text'].includes(field.inputType)) {
          // Use the _id if available, otherwise keep original
          newField.defaultValue = value._id || value.id || value;
        } else if (value !== undefined && value !== null) {
          if (field.inputType === 'multiSelect' && !Array.isArray(value)) {
            newField.defaultValue = typeof value === 'object' ? [value._id || value.id || value] : [value];
          } else {
            newField.defaultValue = value;
          }
        }

        return newField;
      });
    }
    return formFields;
  }, [formFields, data]);

  const { schema } = useDynamicFormSchema(customFormFields);

  const customDefaultValues = React.useMemo(() => {
    const defaults = getDefaultValues(data, customFormFields);
    if (capitalizeInputs) {
      Object.keys(defaults).forEach(key => {
        const fieldConfig = customFormFields.find(f => f.name === key);
        const isTextInput = !fieldConfig || (!fieldConfig.inputType && fieldConfig.type !== "date") || fieldConfig.inputType === "async-text";
        if (key !== "email" && typeof defaults[key] === "string" && isTextInput) {
          defaults[key] = defaults[key].toUpperCase();
        }
      });
    }
    return defaults;
  }, [data, customFormFields, capitalizeInputs]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: customDefaultValues,
  });

  const prevOpen = React.useRef(open);
  const prevDataId = React.useRef(data ? (data._id || 'has-data') : 'no-data');

  // Reset form when form is opened/closed or data changes
  React.useEffect(() => {
    const currentDataId = data ? (data._id || 'has-data') : 'no-data';

    // Only reset if it just opened, just closed, or data identity fundamentally changed
    // This prevents periodic background refetches from randomly wiping out all typed form inputs
    if (open !== prevOpen.current || currentDataId !== prevDataId.current) {
      form.reset(customDefaultValues);
      prevOpen.current = open;
      prevDataId.current = currentDataId;
      isSubmittingRef.current = false;
    }
  }, [open, data, customDefaultValues, form]);

  const handleSubmit = React.useCallback(async (passedValues) => {
    if (isSubmittingRef.current) return;
    let didSubmitSuccessfully = false;
    try {
      isSubmittingRef.current = true;
      setLoading(true);
      // Use passed values if available (from form.handleSubmit), otherwise fallback to current values
      const values = passedValues || form.getValues();
      const success = await onSubmit(values);

      if (success !== false) {
        didSubmitSuccessfully = true;
        // Wait for the dialog animation to complete before resetting and closing
        handleOpenChange(false);
        setTimeout(() => {
          form.reset(customDefaultValues);
        }, 150);
      }
    } catch (error) {
      console.warn("Form submission failed:", error.message);

      // Attempt to set form errors if the error response provides field-level details
      if (error.details?.errors) {
        let hasMatchedField = false;
        if (Array.isArray(error.details.errors)) {
          error.details.errors.forEach(({ field, message }) => {
            const hasField = customFormFields.some((f) => f.name === field);
            if (hasField) hasMatchedField = true;
            const fieldLabel = customFormFields.find(f => f.name === field)?.label || field;
            form.setError(field, {
              type: "manual",
              message: `${fieldLabel} ${message}`,
            });
          });
        } else {
          Object.entries(error.details.errors).forEach(([field, message]) => {
            const hasField = customFormFields.some((f) => f.name === field);
            if (hasField) hasMatchedField = true;
            // Find the label for the field to provide a more readable error
            const fieldLabel = customFormFields.find(f => f.name === field)?.label || field;

            form.setError(field, {
              type: "manual",
              message: `${fieldLabel} ${message}`,
            });
          });
        }

        if (!hasMatchedField && error.message) {
          toast.error(error.message);
        }
      } else if (error.message) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
      if (!didSubmitSuccessfully) {
        isSubmittingRef.current = false;
      }
    }
  }, [form, customFormFields, onSubmit, handleOpenChange, customDefaultValues]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? trigger : (!hideButton && (
          <Button variant={triggerVariant || (triggerClass ? "default" : "outline")} className={triggerClass} size={!triggerText ? "icon" : "default"}>
            {data ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {triggerText && <span className="ml-2">{triggerText}</span>}
          </Button>
        ))}
      </DialogTrigger>

      <DialogContent ref={popupRef} data-html2canvas-popup="true" className={`sm:max-w-[800px] p-0 gap-0 overflow-hidden rounded-2xl max-h-[90dvh] flex flex-col [&>button.absolute]:hidden ${className || ""}`}>
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 sticky top-0 z-20 shrink-0">
          <button
            type="button"
            className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0 focus:outline-none hover:bg-blue-500/30 dark:hover:bg-blue-500/40 transition-colors cursor-pointer"
            onClick={handleDownload}
            title="Download Image"
            data-html2canvas-ignore="true"
          >
            {data ? <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          </button>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0 text-foreground">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground m-0">
                  {description}
                </div>
              </DialogDescription>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2" data-html2canvas-ignore="true">
            <DialogClose asChild>
              <button className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="p-5 overflow-y-auto flex-1 min-h-0 !shrink">

          <FormContent
            key={data ? `edit-${data?._id}` : `create-${title}`}
            form={form}
            formFields={customFormFields}
            handleSubmit={handleSubmit}
            data={data}
            loading={loading}
            apiKey={apiKey}
            submitButtonClass={submitButtonClass}
            buttonContainerClass={buttonContainerClass}
            capitalizeInputs={capitalizeInputs}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
