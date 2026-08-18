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
import { Edit, Loader, Plus, Minus } from "lucide-react";
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
import { Card, CardContent, CardHeader } from "./ui/card";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { useRouter } from "next/navigation";
import { ColorInput } from "./ColorInput"; // Import the new ColorInput component

const NumberNavInput = ({ field, formField }) => {
  const intervalRef = React.useRef(null);
  const timeoutRef = React.useRef(null);
  const latestValue = React.useRef(formField.value);

  React.useEffect(() => {
    latestValue.current = formField.value;
  }, [formField.value]);

  const applyChange = (amount) => {
    const current = Number(latestValue.current) || 0;
    const next = current + amount;
    
    if (amount < 0 && field.validators?.min !== undefined && next < field.validators.min) return;
    if (amount > 0 && field.validators?.max !== undefined && next > field.validators.max) return;
    
    latestValue.current = next;
    formField.onChange(next);
  };

  const handleStart = (e, amount) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    
    handleStop();
    applyChange(amount);
    
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        applyChange(amount);
      }, 75);
    }, 400);
  };

  const handleStop = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  React.useEffect(() => {
    const handlePointerUp = () => handleStop();
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      handleStop();
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <div className="relative flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute left-1 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent select-none touch-manipulation"
        onPointerDown={(e) => handleStart(e, -1)}
        onPointerUp={handleStop}
        onPointerLeave={handleStop}
        onContextMenu={(e) => e.preventDefault()}
        disabled={field.disabled || (field.validators?.min !== undefined && Number(formField.value || 0) <= field.validators.min)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        placeholder={field.placeholder}
        {...formField}
        value={formField.value !== undefined ? formField.value : ""}
        onChange={(e) => formField.onChange(e.target.value === "" ? "" : Number(e.target.value))}
        readOnly={field.readOnly}
        className="text-center px-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent select-none touch-manipulation"
        onPointerDown={(e) => handleStart(e, 1)}
        onPointerUp={handleStop}
        onPointerLeave={handleStop}
        onContextMenu={(e) => e.preventDefault()}
        disabled={field.disabled || (field.validators?.max !== undefined && Number(formField.value || 0) >= field.validators.max)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

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

const FormFields = ({ form, fields, apiKey, isSubmitting }) =>
  fields.map((field, idx) => (
    <FormField
      key={idx}
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={field.className || "col-span-2 md:col-span-1"}>
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
                onChange={(value) => formField.onChange(value)}
                disabled={field.disabled}
                apiKey={apiKey}
                maxFileSize={field.maxFileSize}
                allowedTypes={field.allowedTypes}
                minWidth={field.minWidth}
                minHeight={field.minHeight}
                maxWidth={field.maxWidth}
                maxHeight={field.maxHeight}
                aspectRatio={field.aspectRatio}
                readOnly={field.readOnly}
                hasSubmitButton={field.hasSubmitButton}
                isSubmitting={isSubmitting}
              />
            ) : field.inputType === "select" ||
              field.inputType === "multiSelect" ? (
              <MultiSelect
                options={field.options || []}
                placeholder={field.placeholder || "Select options"}
                multiSelect={field.inputType === "multiSelect"}
                value={formField.value}
                onValueChange={(value) => formField.onChange(value)}
                readOnly={field.readOnly}
                freeSolo={field.freeSolo}
              />
            ) : field.inputType === "toggle" ? (
              <div className="flex items-center space-x-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.onLabel && field.offLabel
                    ? (field.invertToggle ? !formField.value : !!formField.value)
                      ? field.onLabel
                      : field.offLabel
                    : field.label}
                </Label>
                <Switch
                  id={field.name}
                  checked={field.invertToggle ? !formField.value : (formField.value || false)}
                  onCheckedChange={(checked) => formField.onChange(field.invertToggle ? !checked : checked)}
                  disabled={field.disabled}
                />
              </div>
            ) : field.inputType === "color" ? (
              <ColorInput
                name={field.name}
                value={formField.value}
                onChange={(value) => formField.onChange(value)}
                onBlur={formField.onBlur}
                disabled={field.disabled}
                readOnly={field.readOnly}
                placeholder={field.placeholder || "Select a color"}
                showPalette={field.showPalette !== false}
                customColors={field.customColors}
              />
            ) : field.inputType === "textarea" ? (
              <Textarea
                placeholder={field.placeholder}
                {...formField}
                readOnly={field.readOnly}
                rows={field.rows || 3}
              />
            ) : field.inputType === "number-nav" ? (
              <NumberNavInput field={field} formField={formField} />
            ) : field.inputType === "submit" ? (
              <div className="w-full">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className={field.buttonClassName || "w-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"}
                >
                  {isSubmitting ? <Loader className="animate-spin h-4 w-4 mr-2" /> : (field.buttonText || "Submit")}
                </Button>
              </div>
            ) : (
              <Input
                type={field.type || "text"}
                placeholder={field.placeholder}
                {...formField}
                value={typeof formField.value === "object" && formField.value !== null && !Array.isArray(formField.value) ? "" : formField.value}
                readOnly={field.readOnly}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ));

const FormContent = ({
  form,
  formFields,
  handleSubmit,
  data,
  loading,
  apiKey,
  hideSubmitOn,
  gridCols = "grid-cols-2 md:grid-cols-2",
  hideDefaultSubmit = false,
  renderPreview,
  formValues,
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
        className="max-w-full pb-2"
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
        <div className={`px-2 ${renderPreview ? "flex flex-col md:flex-row gap-6" : ""}`}>
          <div className={renderPreview ? "flex-1 min-w-[300px]" : "w-full"}>
            {sectionOrder.map((section, index) => (
              <div
                key={section}
                className={`grid gap-4 ${gridCols} ${activeSectionIndex === index ? "block" : "hidden"
                  }`}
              >
                {section !== "undefined" && (
                  <h2 className="text-lg font-bold col-span-2">{section}</h2>
                )}
                <FormFields
                  form={form}
                  fields={sections[section]}
                  apiKey={apiKey}
                  isSubmitting={loading}
                />
              </div>
            ))}
          </div>
          {renderPreview && (
            <div className="flex-1 flex justify-center items-start">
              {renderPreview(formValues)}
            </div>
          )}
        </div>
        {!hideDefaultSubmit && (
          <div className="flex gap-3 mt-8">
            {activeSectionIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSectionIndex((prev) => prev - 1)}
              >
                Previous
              </Button>
            )}
            {activeSectionIndex === totalSections - 1 ? (
              (!hideSubmitOn ||
                form.getValues()[hideSubmitOn.field] !== hideSubmitOn.value ||
                form.formState.isDirty) && (
                <Button className="ml-auto" type="submit" disabled={loading}>
                  {loading ? (
                    <Loader className="animate-spin mr-2" />
                  ) : data ? (
                    "Save changes"
                  ) : (
                    "Submit"
                  )}
                </Button>
              )
            ) : (
              <Button
                type="button"
                className="ml-auto"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSectionIndex((prev) => prev + 1);
                }}
              >
                Next
              </Button>
            )}
          </div>
        )}
      </form>
    </Form>
  );
};

export default function FormComponent({
  data = null,
  formFields = [],
  title = "",
  description = "",
  loading = false,
  apiKey,
  resource,
  returnBack = false,
  hideSubmitOn,
  onSuccess,
  gridCols,
  removeCardWrapper = false,
  hideDefaultSubmit = false,
  renderPreview,
}) {
  const [customizedFormField, setCustomizedFormField] =
    React.useState(formFields);

  const router = useRouter();

  const { schema } = useDynamicFormSchema(customizedFormField);

  const defaultValues = React.useMemo(() => {
    return getDefaultValues(data, formFields);
  }, [data, formFields, schema]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "all",
    key: data ? `edit-${data?._id}` : `create ${title}`,
  });

  const formValues = useWatch({ control: form.control });

  const { useAddItem, useUpdateItem } = useCrud(resource, apiKey);

  const addItem = useAddItem();
  const updateItem = useUpdateItem();

  const handleSubmit = React.useCallback(async () => {
    try {
      const values = form.getValues();

      if (data) {
        await updateItem.mutateAsync({
          data: { ids: [data._id], ...values },
        });
        toast.success("Updated successfully!");
        if (onSuccess) onSuccess();
      } else {
        await addItem.mutateAsync(values);
        toast.success("Saved successfully!");
        if (onSuccess) onSuccess();
      }
      if (returnBack) {
        router.back();
      }
    } catch (error) {
      console.error("Form submission failed:", error.message);
      toast.error(
        error?.message ||
        "Failed to save data. Please check the form and try again."
      );
      if (error.details?.errors) {
        error.details.errors.forEach(({ field, message }) => {
          const fieldLabel =
            formFields?.find((f) => f.name === field)?.label || "This value";
          form.setError(field, {
            type: "manual",
            message: `${fieldLabel} ${message}`,
          });
        });

        return;
      }
    } finally {
      if (!data) {
        form.reset();
      }
      router.refresh();
      if (data) {
        form.reset(form.getValues());
      }
    }
  }, [data, form, updateItem, addItem, returnBack, router]);

  React.useEffect(() => {
    setCustomizedFormField(
      formFields.filter(
        (field) =>
          (data ? !field?.hideOnEdit : true) &&
          (!field.conditionalRender ||
            (field.conditionalRender.expectedValue !== undefined
              ? field.conditionalRender.expectedValue ===
              formValues[field.conditionalRender.dependentField]
              : !!formValues[field.conditionalRender.dependentField]))
      )
    );
  }, [data, formFields, formValues]);

  const content = (
    <FormContent
      key={data ? `edit-${data?._id}` : `create ${title}`}
      form={form}
      formFields={customizedFormField}
      handleSubmit={handleSubmit}
      data={data}
      loading={loading}
      apiKey={apiKey}
      hideSubmitOn={hideSubmitOn}
      gridCols={gridCols}
      hideDefaultSubmit={hideDefaultSubmit}
      renderPreview={renderPreview}
      formValues={formValues}
    />
  );

  if (removeCardWrapper) {
    return (
      <div className={title || description ? "space-y-4" : ""}>
        {(title || description) && (
          <div className="space-y-1.5 px-2">
            {title && <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className={title || description ? "px-2" : ""}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className={title || description ? "p-6 pb-0" : "p-2"}>
        <div className="space-y-1.5">
          {title && (
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
