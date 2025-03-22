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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
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
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="grid items-start gap-4 max-h-[80vh] overflow-auto"
    >
      {formFields.map((field, index) => (
        <FormField
          key={index}
          control={form.control}
          name={field.name}
          render={({ field: formField }) => (
            <FormItem>
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
                    value={formField.value}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <div className="flex w-full gap-3 mt-2">
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
  const isMobile = useIsMobile();
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

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            {data ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <FormContent
            key={data ? `edit-${data._id}` : `create ${title}`}
            form={form}
            formFields={formFields}
            handleSubmit={handleSubmit}
            data={data}
            loading={loading}
            token={token}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">
          {data ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="px-4">
          <FormContent
            form={form}
            formFields={formFields}
            handleSubmit={handleSubmit}
            data={data}
            loading={loading}
          />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
