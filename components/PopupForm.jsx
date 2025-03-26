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
import { Edit, Loader2, Plus } from "lucide-react";
import { MultiSelect } from "./ui/multi-select";
import { useForm } from "react-hook-form";
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

const FormContent = ({
  form,
  formFields,
  handleSubmit,
  data,
  loading,
  token,
}) => {
  const sections = React.useMemo(() => {
    return formFields.reduce((acc, field) => {
      if (!acc[field.section]) acc[field.section] = [];
      acc[field.section].push(field);
      return acc;
    }, {});
  }, [formFields]);

  const sectionRefs = React.useRef({}); // Store refs for each section
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);

  const sectionOrder = React.useMemo(() => Object.keys(sections), [sections]);
  const totalSections = sectionOrder.length;
  const progress = ((activeSectionIndex + 1) / totalSections) * 100; // Calculate progress percentage

  const handleNextSection = (e) => {
    e.preventDefault();
    if (activeSectionIndex < totalSections - 1) {
      setActiveSectionIndex(activeSectionIndex + 1);
    }
  };

  const handlePreviousSection = () => {
    if (activeSectionIndex > 0) {
      setActiveSectionIndex(activeSectionIndex - 1);
    }
  };

  // Automatically scroll the active section into view
  React.useEffect(() => {
    if (sectionRefs.current[sectionOrder[activeSectionIndex]]) {
      sectionRefs.current[sectionOrder[activeSectionIndex]].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [activeSectionIndex]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="max-w-full overflow-hidden"
      >
        {/* Progress Bar */}
        {totalSections > 1 && (
          <div className="mb-4">
            <div className="flex mb-1 text-sm font-medium">
              <span>
                Step {activeSectionIndex + 1} of {totalSections}
              </span>
            </div>
            <Progress value={progress} className="h-2" /> {/* Progress bar */}
          </div>
        )}

        {/* Section Navigation Tabs */}
        {totalSections > 1 && (
          <div className="flex mb-4 border-b max-w-full overflow-x-auto scroll-[none] hide-scrollbar">
            {sectionOrder.map((section, index) => (
              <button
                ref={(el) => (sectionRefs.current[section] = el)}
                key={`section-${index}`}
                type="button"
                className={`px-4 py-2 text-sm text-nowrap ${
                  activeSectionIndex === index
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveSectionIndex(index)}
              >
                {section}
              </button>
            ))}
          </div>
        )}

        {/* Sectioned Form Content */}
        <div className="max-h-[60vh] overflow-y-auto px-2">
          {sectionOrder.map((sectionName, index) => (
            <div
              key={sectionName}
              className={`grid grid-cols-1  items-start gap-4 ${
                activeSectionIndex === index ? "block" : "hidden"
              }`}
            >
              {sectionName !== "undefined" && (
                <h2 className="text-lg font-bold">{sectionName}</h2>
              )}
              {sections[sectionName].map((field, idx) => (
                <FormField
                  key={idx}
                  control={form.control}
                  name={field.name}
                  render={({ field: formField }) => (
                    <FormItem className={field.className}>
                      {field.label && !field.hideLabel && (
                        <FormLabel htmlFor={field.name}>
                          {field.label}
                          {field.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </FormLabel>
                      )}
                      <FormControl>
                        {field.inputType === "image" ? (
                          <ImageUploader
                            value={formField.value}
                            onChange={formField.onChange}
                          />
                        ) : field.inputType === "select" ||
                          field.inputType === "multiSelect" ? (
                          <MultiSelect
                            options={field.options || []}
                            placeholder={field.placeholder || "Select options"}
                            multiSelect={field.inputType === "multiSelect"}
                            value={formField.value}
                            onValueChange={(value) => formField.onChange(value)}
                          />
                        ) : (
                          <Input
                            {...formField}
                            type={field.type || "text"}
                            placeholder={field.placeholder}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex w-full gap-3 mt-4">
          {activeSectionIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-1/2"
              onClick={handlePreviousSection}
            >
              Previous
            </Button>
          )}

          {activeSectionIndex === totalSections - 1 ? (
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : data ? (
                "Save changes"
              ) : (
                "Create"
              )}
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={handleNextSection}
            >
              Next
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

export default function PopupForm({
  data = null,
  formFields = [],
  onSubmit,
  title = "",
  description = "",
  loading = false,
  token,
}) {
  const [open, setOpen] = React.useState(false);
  const [customizedFormField, setCustomizedFormField] =
    React.useState(formFields);

  const { schema } = useDynamicFormSchema(customizedFormField);

  const defaultValues = React.useMemo(() => {
    return getDefaultValues(data, formFields);
  }, [data, formFields]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "all",
    key: data ? `edit-${data._id}` : `create ${title}`,
  });

  const formValues = form.watch();

  const handleSubmit = React.useCallback(
    async (values) => {
      try {
        await onSubmit(values);
        setOpen(false);
      } catch (error) {
        console.error("Form submission failed:", error.message);
      }
    },
    [onSubmit]
  );

  React.useEffect(() => {
    setCustomizedFormField(
      formFields.filter(
        (field) =>
          (data ? !field?.hideOnEdit : true) &&
          (!field.conditionalRender ||
            field.conditionalRender.expectedValue ===
              formValues[field.conditionalRender.dependentField])
      )
    );
  }, [data, formFields, JSON.stringify(formValues)]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {data ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[90%] mx-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <FormContent
          key={data ? `edit-${data._id}` : `create ${title}`}
          form={form}
          formFields={customizedFormField}
          handleSubmit={handleSubmit}
          data={data}
          loading={loading}
          token={token}
        />
      </DialogContent>
    </Dialog>
  );
}
