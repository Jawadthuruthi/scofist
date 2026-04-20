"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Upload, ChevronsUpDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  dateOfBirth: z.date({
    required_error: "Date of birth is required.",
  }),
  address: z.object({
    houseName: z.string().optional(),
    place: z.string().min(2, "Place is required"),
    postOffice: z.string().optional(),
    district: z.string().min(2, "District is required"),
    state: z.string().min(2, "State is required"),
    pin: z.string().regex(/^\d{6}$/, "Invalid PIN code").optional().or(z.literal("")),
  }),
  guardianName: z.string().min(2, "Guardian name is required"),
  guardianContactNumber: z
    .string()
    .regex(/^\+?\d{10,15}$/, "Invalid contact number"),
  guardianAlternativeNumber: z
    .string()
    .regex(/^\+?\d{10,15}$/, "Invalid contact number")
    .optional()
    .or(z.literal("")),
  relationship: z.string().min(2, "Relationship is required"),
  admissionClass: z.string().min(1, "Admission class is required"),
  academicStream: z.string().optional(),
  sslcRegistrationNumber: z.string().optional(),
  sslcGraduationYear: z.string().optional(),
  islamicEducationQualification: z.string().optional(),
  academicEducationQualification: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  aadharNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhar number must be 12 digits")
    .optional()
    .or(z.literal("")),
  bloodGroup: z.string().optional(),
});

export default function ApplicationForm({ trigger }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dobInput, setDobInput] = useState("");
  const [availableClasses, setAvailableClasses] = useState(["+1", "Degree"]);

  useEffect(() => {
    fetch("/api/applications/classes")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.classes) {
          setAvailableClasses(data.classes);
        }
      })
      .catch((err) => console.error("Failed to fetch classes", err));
  }, []);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: {
        houseName: "",
        place: "",
        postOffice: "",
        district: "",
        state: "Kerala",
        pin: "",
      },
      guardianName: "",
      guardianContactNumber: "",
      guardianAlternativeNumber: "",
      relationship: "",
      admissionClass: "",
      academicStream: "",
      sslcRegistrationNumber: "",
      sslcGraduationYear: "",
      islamicEducationQualification: "",
      academicEducationQualification: "",
      email: "",
      aadharNumber: "",
      bloodGroup: "",
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => setFile(acceptedFiles[0]),
    accept: { "image/*": [] },
    multiple: false,
  });

  const onSubmit = async (values) => {
    setUploading(true);

    try {
      let profilePic = undefined;

      // Upload photo only if one was selected
      if (file) {
        const signResponse = await fetch("/api/sign-cloudinary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "active-role": "College Admin",
          },
          body: JSON.stringify({ folder: "applications" }),
        });

        if (!signResponse.ok) {
          const errorData = await signResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to get upload signature");
        }

        const { signature, timestamp, cloudName, apiKey: cloudApiKey, folder } = await signResponse.json();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", cloudApiKey);
        formData.append("timestamp", timestamp);
        formData.append("signature", signature);
        formData.append("folder", folder);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          { method: "POST", body: formData }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error?.message || "Image upload failed");
        }

        const uploadResult = await uploadResponse.json();
        profilePic = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
      }

      // Submit Application Data
      const applicationData = {
        ...values,
        ...(profilePic ? { profilePic } : {}),
        dateOfBirth: values.dateOfBirth.toISOString(),
      };

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit application");
      }

      toast.success("Application submitted successfully!");
      setOpen(false);
      form.reset();
      setFile(null);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const admissionClass = form.watch("admissionClass");

  // Helper to parse DD/MM/YYYY to Date
  const parseDisplayDate = (str) => {
    const parts = str.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const date = new Date(year, month - 1, day);
    // Validate date is real (e.g. not 31/02/2020)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    )
      return null;
    return date;
  };

  const handleDobInputChange = (e, onChange) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);

    let formattedValue = "";
    if (value.length > 0) {
      formattedValue = value.slice(0, 2);
      if (value.length > 2) {
        formattedValue += "/" + value.slice(2, 4);
        if (value.length > 4) {
          formattedValue += "/" + value.slice(4, 8);
        }
      }
    }

    setDobInput(formattedValue);

    const parsed = formattedValue.length === 10 ? parseDisplayDate(formattedValue) : null;
    onChange(parsed || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Student Application</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Details</h3>

              {/* Photo Upload */}
              <div className="space-y-2">
                <FormLabel>Profile Picture <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Drag &amp; drop or click to upload photo
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="DD/MM/YYYY"
                            value={dobInput !== "" ? dobInput : (field.value ? format(field.value, "dd/MM/yyyy") : "")}
                            onChange={(e) => handleDobInputChange(e, field.onChange)}
                            maxLength={10}
                            className="flex-1"
                          />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "px-3 font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                if (date) {
                                  setDobInput(format(date, "dd/MM/yyyy"));
                                }
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormDescription className="text-xs">
                        Enter manually as DD/MM/YYYY or use the calendar icon
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email & Aadhar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email{" "}
                        <span className="text-gray-400 font-normal">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Aadhar Number{" "}
                        <span className="text-gray-400 font-normal">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12-digit Aadhar number"
                          maxLength={12}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Blood Group{" "}
                        <span className="text-gray-400 font-normal">(Optional)</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Blood Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                            (bg) => (
                              <SelectItem key={bg} value={bg}>
                                {bg}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Address Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address.houseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          House Name{" "}
                          <span className="text-gray-400">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Darul Huda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.place"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Place <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Calicut" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.postOffice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Post Office{" "}
                          <span className="text-gray-400">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="PO Calicut" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          District <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Kozhikode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          State <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Kerala"
                            {...field}
                            value={field.value || "Kerala"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          PIN Code <span className="text-gray-400 font-normal">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="673001"
                            {...field}
                            maxLength={6}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Guardian Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Guardian Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guardianName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guardian Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="Father" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guardianContactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guardianAlternativeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alt. Contact Number</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Academic Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Academic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="admissionClass"
                  render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Admission Needed For</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={availableClasses.map((c) => ({ value: c, label: c }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select or type class"
                        variant="default"
                        animation={0}
                        maxCount={1}
                        multiSelect={false}
                        freeSolo={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                {admissionClass === "+1" && (
                  <FormField
                    control={form.control}
                    name="academicStream"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Stream</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Stream" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Science">Science</SelectItem>
                            <SelectItem value="Commerce">Commerce</SelectItem>
                            <SelectItem value="Humanities">
                              Humanities
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {admissionClass === "+1" && (
                  <>
                    <FormField
                      control={form.control}
                      name="sslcRegistrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SSLC Reg. Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sslcGraduationYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SSLC Year</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from(
                                { length: 5 },
                                (_, i) => new Date().getFullYear() - i
                              ).map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                  {y}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="islamicEducationQualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Islamic Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 5th Standard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="academicEducationQualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 10th Standard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
