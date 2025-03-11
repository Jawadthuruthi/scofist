// PopupForm.jsx
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
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { Edit, Plus } from "lucide-react";
import { AdvancedInput } from "./AdvancedInput";

export function PopupForm({
  data = null,
  formFields = [],
  onSubmit,
  title = "",
  description = "",
}) {
  const [open, setOpen] = React.useState(false);
  const [formValues, setFormValues] = React.useState({});
  const isMobile = useIsMobile();

  React.useEffect(() => {
    // Initialize form values with existing data if provided
    if (data) {
      const initialValues = {};
      formFields.forEach((field) => {
        initialValues[field.name] = data[field.name] || "";
      });
      setFormValues(initialValues);
    } else {
      // Initialize with empty values
      const initialValues = {};
      formFields.forEach((field) => {
        initialValues[field.name] = field.inputType === "multiSelect" ? [] : "";
      });
      setFormValues(initialValues);
    }
  }, [data, formFields]);

  const handleInputChange = (name, value) => {
    setFormValues((prev) => {
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formValues);
    setOpen(false);
  };

  const renderFormField = (field) => {
    // Handle AdvancedInput types (select and multiSelect)
    if (field.inputType === "select" || field.inputType === "multiSelect") {
      return (
        <AdvancedInput
          label={field.label}
          placeholder={field.placeholder || "Select..."}
          options={field.options || []}
          value={formValues[field.name]}
          onChange={(value) => handleInputChange(field.name, value)}
          type={field.inputType}
          disableSearch={field.disableSearch}
          valueKey={field.valueKey || "_id"}
          required={field.required}
          disabled={field.disabled}
          freeSolo={field.freeSolo}
        />
      );
    }

    // For regular inputs
    return (
      <>
        {field.label && !field.hideLabel && (
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <Input
          type={field.type || "text"}
          id={field.name}
          name={field.name}
          placeholder={field.placeholder}
          value={formValues[field.name] || ""}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          required={field.required}
          disabled={field.disabled}
        />
      </>
    );
  };

  const FormContent = () => (
    <form className="grid items-start gap-4" onSubmit={handleSubmit}>
      {formFields.map((field, index) => (
        <div key={index} className="space-y-2">
          {renderFormField(field)}
        </div>
      ))}
      <div className="flex w-full gap-3 mt-2">
        <Button className="w-full" type="submit">
          {data ? "Save changes" : "Create"}
        </Button>
      </div>
    </form>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            {data ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <FormContent />
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
          <FormContent />
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
