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

const FormContent = ({
  form,
  formFields,
  handleSubmit,
  data,
  loading,
  token,
}) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4 max-h-[70vh] overflow-auto">
        {formFields.map((field, index) => (
          <FormField
            key={index}
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
                      disabled={field.disabled}
                      token={token}
                      maxFileSize={field.maxFileSize}
                      allowedTypes={field.allowedTypes}
                      minWidth={field.minWidth}
                      minHeight={field.minHeight}
                      maxWidth={field.maxWidth}
                      maxHeight={field.maxHeight}
                      aspectRatio={field.aspectRatio}
                    />
                  ) : field.inputType === "select" ||
                    field.inputType === "multiSelect" ? (
                    <MultiSelect
                      options={field.options || []}
                      placeholder={field.placeholder || "Select options"}
                      disableSearch={field.disableSearch || false}
                      multiSelect={field.inputType === "multiSelect"}
                      freeSolo={field.freeSolo || false}
                      variant={field.variant || "default"}
                      maxCount={field.maxCount || 0}
                      animation={field.animation || 0}
                      modalPopover={field.modalPopover || false}
                      disabled={field.disabled}
                      value={formField.value}
                      onValueChange={(value) => formField.onChange(value)}
                    />
                  ) : (
                    <Input
                      {...formField}
                      type={field.type || "text"}
                      name={field.name}
                      id={field.name}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      value={
                        field.type === "date" && formField.value
                          ? formField.value.split("T")[0]
                          : formField.value
                      }
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
      <div className="flex w-full gap-3 mt-4">
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="animate-spin mr-2" />
          ) : data ? (
            "Save changes"
          ) : (
            "Create"
          )}
        </Button>
      </div>
    </form>
  </Form>
);

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

  const { schema } = useDynamicFormSchema(formFields);

  const defaultValues = React.useMemo(() => {
    return getDefaultValues(data, formFields);
  }, [data, formFields]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
    key: data ? `edit-${data._id}` : `create ${title}`,
  });

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

  const filteredFormFields = React.useMemo(
    () => formFields.filter((field) => (data ? !field?.hideOnEdit : true)),
    [data, formFields]
  );

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
          formFields={filteredFormFields}
          handleSubmit={handleSubmit}
          data={data}
          loading={loading}
          token={token}
        />
      </DialogContent>
    </Dialog>
  );
}
