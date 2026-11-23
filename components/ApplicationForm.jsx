"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  CheckCircle2,
  X,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  User,
  Home as HomeIcon,
  BookOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import ImageUploader from "./ImageUploader";

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
    pin: z
      .string()
      .regex(/^\d{6}$/, "Invalid 6-digit PIN code")
      .optional()
      .or(z.literal("")),
  }),
  guardianName: z.string().min(2, "Guardian name is required"),
  guardianContactNumber: z
    .string()
    .regex(/^\+?\d{10,15}$/, "Invalid contact number (10-15 digits)"),
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
  const [currentStep, setCurrentStep] = useState(1);
  const [profilePic, setProfilePic] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dobInput, setDobInput] = useState("");
  const [availableClasses, setAvailableClasses] = useState(["+1", "Degree"]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setCurrentStep(1);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [submitted]);

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
        state: "",
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

  const onSubmit = async (values) => {
    if (uploading) return;
    setUploading(true);

    try {
      const applicationData = {
        ...values,
        ...(profilePic && profilePic.url ? { profilePic } : {}),
        dateOfBirth: values.dateOfBirth.toISOString(),
      };

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        let errorMsg = "Failed to submit application";
        try {
          const data = await response.json();
          errorMsg = data.message || data.error || errorMsg;
        } catch {
          // If response body is not JSON (e.g. 504 Gateway Timeout HTML)
          errorMsg = `Server returned error (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMsg);
      }

      setSubmitted(true);
      form.reset();
      setProfilePic(null);
      setDobInput("");
      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const admissionClass = form.watch("admissionClass");

  const parseDisplayDate = (str) => {
    const parts = str.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const date = new Date(year, month - 1, day);
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

  const handleNextStep1 = async () => {
    const isValid = await form.trigger(["name", "dateOfBirth", "email", "aadharNumber"]);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handleNextStep2 = async () => {
    const isValid = await form.trigger([
      "guardianName",
      "relationship",
      "guardianContactNumber",
      "guardianAlternativeNumber",
      "address.place",
      "address.district",
      "address.state",
      "address.pin",
    ]);
    if (isValid) {
      setCurrentStep(3);
    }
  };

  const inputStyle =
    "bg-white dark:bg-white/[0.04] border-neutral-300 dark:border-white/10 text-neutral-900 dark:text-[#f7f5ee] placeholder:text-neutral-400 dark:placeholder:text-[#6e756b] focus-visible:border-emerald-600 dark:focus-visible:border-emerald-500/50 focus-visible:ring-emerald-600/20 dark:focus-visible:ring-emerald-500/20 rounded-lg h-10 transition-colors shadow-xs dark:shadow-none";
  const labelStyle = "text-xs font-semibold text-neutral-800 dark:text-[#ded9ce] flex items-center gap-1";

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setSubmitted(false);
          setCurrentStep(1);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={cn(
          "[&>button.absolute]:hidden p-0 gap-0 flex flex-col max-h-[88vh] sm:max-h-[90vh]",
          "bg-white dark:bg-[#080c09] text-neutral-900 dark:text-[#ded9ce] border border-neutral-200 dark:border-[#1b2b20] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.95)] backdrop-blur-2xl rounded-2xl sm:rounded-3xl",
          submitted ? "max-w-md" : "max-w-3xl"
        )}
      >
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 sm:px-8 space-y-5 text-center flex-1 bg-white dark:bg-[#080c09]">
            <div className="rounded-full bg-emerald-50 dark:bg-[#122218] border border-emerald-200 dark:border-[#1f3a29] p-4 text-emerald-600 dark:text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-in zoom-in duration-300">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-2xl font-bold text-neutral-950 dark:text-[#f7f5ee]">
                Application Received
              </h3>
              <p className="text-sm text-neutral-600 dark:text-[#8c887f] leading-relaxed">
                Your admission application has been registered with Sadiya Dawa College. Our admissions committee will review your records and reach out via phone.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSubmitted(false);
                  setCurrentStep(1);
                }}
                className="bg-[#1a2217] dark:bg-[#f7f5ee] text-white dark:text-[#07160d] hover:bg-black dark:hover:bg-white px-6 py-2.5 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Collegiate Dialog Header */}
            <DialogHeader className="flex flex-row items-center justify-between gap-3 mx-0 px-5 sm:px-6 py-4 border-b border-neutral-200 dark:border-[#1b2b20] bg-white/95 dark:bg-[#080d09]/95 sticky top-0 z-20 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-[#122218] border border-emerald-200 dark:border-[#1f3a29] flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <GraduationCap className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-base sm:text-lg font-bold m-0 text-neutral-950 dark:text-[#f7f5ee]">
                    Application for Admission
                  </DialogTitle>
                  <p className="text-xs text-neutral-600 dark:text-[#8c887f] mt-0.5">
                    Sa-adiya College of Integrated Studies · Kasaragod
                  </p>
                </div>
              </div>
              <DialogClose
                className="p-1.5 rounded-full border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/[0.04] hover:bg-neutral-200 dark:hover:bg-white/[0.08] transition-colors text-neutral-600 dark:text-[#a6ada4] hover:text-neutral-950 dark:hover:text-[#f7f5ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
                aria-label="Close application form"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </DialogHeader>

            {/* Stepper Bar */}
            <div
              className="px-5 sm:px-6 py-3 border-b border-neutral-200 dark:border-[#1b2b20] bg-neutral-50/50 dark:bg-white/[0.015]"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-400 text-xxs font-semibold">
                    {currentStep}
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-[#ded9ce]">
                    {currentStep === 1 && "Personal Information"}
                    {currentStep === 2 && "Guardian & Residential Address"}
                    {currentStep === 3 && "Academic Details & Stream"}
                  </span>
                </div>
                <span className="text-neutral-600 dark:text-[#8c887f] font-medium">Step {currentStep} of 3</span>
              </div>
              {/* Progress Track */}
              <div className="w-full h-1 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300 ease-out"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Form Canvas */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* STEP 1: PERSONAL INFORMATION */}
                  {currentStep === 1 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-[#1b2b20]">
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-sm font-bold text-neutral-950 dark:text-[#f7f5ee]">
                          Applicant Personal Details
                        </h4>
                      </div>

                      {/* Photo Upload */}
                      <div className="space-y-2">
                        <label className={labelStyle}>Profile Photograph (Optional)</label>
                        <div className="max-w-xs">
                          <ImageUploader
                            value={profilePic}
                            onChange={(val) => setProfilePic(val)}
                            aspectRatio="1:1"
                            minWidth={200}
                            minHeight={200}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>
                                Full Name <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                <span className="sr-only">(required)</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Full Name as per official records"
                                  {...field}
                                  aria-required="true"
                                  className={cn(inputStyle, "uppercase")}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className={labelStyle}>
                                Date of Birth <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                <span className="sr-only">(required)</span>
                              </FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input
                                    placeholder="DD/MM/YYYY"
                                    value={
                                      dobInput !== ""
                                        ? dobInput
                                        : field.value
                                          ? format(field.value, "dd/MM/yyyy")
                                          : ""
                                    }
                                    onChange={(e) => handleDobInputChange(e, field.onChange)}
                                    maxLength={10}
                                    aria-required="true"
                                    className={cn(inputStyle, "flex-1")}
                                  />
                                </FormControl>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="px-3 rounded-lg border border-neutral-300 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-neutral-100 dark:hover:bg-white/[0.08] text-neutral-800 dark:text-[#ded9ce] flex items-center justify-center cursor-pointer transition-colors shadow-xs dark:shadow-none"
                                      aria-label="Pick date of birth"
                                    >
                                      <CalendarIcon className="h-4 w-4" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0 bg-white dark:bg-[#0c140e] border border-neutral-200 dark:border-[#1b2b20] text-neutral-900 dark:text-[#ded9ce] shadow-2xl rounded-xl z-50"
                                    align="end"
                                  >
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
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>Email Address (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="student@example.com"
                                  {...field}
                                  className={inputStyle}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="aadharNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>12-Digit Aadhar (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="0000 0000 0000"
                                  maxLength={12}
                                  {...field}
                                  className={inputStyle}
                                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bloodGroup"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>Blood Group</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className={inputStyle}>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white dark:bg-[#0c140e] border border-neutral-200 dark:border-[#1b2b20] text-neutral-900 dark:text-[#ded9ce] shadow-2xl rounded-xl">
                                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                    <SelectItem key={bg} value={bg} className="hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-neutral-900 dark:text-[#ded9ce]">
                                      {bg}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: GUARDIAN & RESIDENTIAL ADDRESS */}
                  {currentStep === 2 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-[#1b2b20]">
                        <HomeIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-sm font-bold text-neutral-950 dark:text-[#f7f5ee]">
                          Guardian & Family Contact
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="guardianName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>
                                Guardian Name <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                <span className="sr-only">(required)</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Parent or Guardian's Name"
                                  {...field}
                                  aria-required="true"
                                  className={cn(inputStyle, "uppercase")}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="relationship"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>
                                Relationship <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                <span className="sr-only">(required)</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Father, Mother, Brother"
                                  {...field}
                                  aria-required="true"
                                  className={cn(inputStyle, "uppercase")}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="guardianContactNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>
                                Primary Contact Number <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                <span className="sr-only">(required)</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="+91 9999999999"
                                  {...field}
                                  aria-required="true"
                                  className={inputStyle}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="guardianAlternativeNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>Alternative WhatsApp / Contact</FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="+91 8888888888"
                                  {...field}
                                  className={inputStyle}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="pt-2">
                        <h4 className="text-xs font-bold text-neutral-950 dark:text-[#f7f5ee] uppercase tracking-wider mb-3">
                          Residential Address
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="address.houseName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelStyle}>House Name / Building</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="House Name"
                                    {...field}
                                    className={cn(inputStyle, "uppercase")}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="address.place"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelStyle}>
                                  Place / Locality <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                  <span className="sr-only">(required)</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Town or Village"
                                    {...field}
                                    aria-required="true"
                                    className={cn(inputStyle, "uppercase")}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="address.district"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelStyle}>
                                  District <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                  <span className="sr-only">(required)</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g. Kasaragod, Kannur"
                                    {...field}
                                    aria-required="true"
                                    className={cn(inputStyle, "uppercase")}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="address.state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelStyle}>
                                  State <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                  <span className="sr-only">(required)</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g. Kerala, Karnataka"
                                    {...field}
                                    aria-required="true"
                                    className={cn(inputStyle, "uppercase")}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="address.pin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelStyle}>6-Digit Postal PIN</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="671001"
                                    maxLength={6}
                                    {...field}
                                    className={inputStyle}
                                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: ACADEMIC DETAILS & QUALIFICATIONS */}
                  {currentStep === 3 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-[#1b2b20]">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-sm font-bold text-neutral-950 dark:text-[#f7f5ee]">
                          Program Selection &amp; Academic Records
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="admissionClass"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className={labelStyle}>
                                Admission Needed For <span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">*</span>
                                <span className="sr-only">(required)</span>
                              </FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={availableClasses.map((c) => ({ value: c, label: c }))}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  placeholder="Select Class (+1 or Degree)"
                                  variant="default"
                                  animation={0}
                                  maxCount={1}
                                  multiSelect={false}
                                  freeSolo={true}
                                  className={inputStyle}
                                  popoverClassName="bg-white dark:bg-[#0c140e] border border-neutral-200 dark:border-[#1b2b20] text-neutral-900 dark:text-[#ded9ce]"
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />

                        {admissionClass === "+1" && (
                          <FormField
                            control={form.control}
                            name="academicStream"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelStyle}>Preferred +1 Stream</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className={inputStyle}>
                                      <SelectValue placeholder="Select Stream" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-white dark:bg-[#0c140e] border border-neutral-200 dark:border-[#1b2b20] text-neutral-900 dark:text-[#ded9ce] shadow-2xl rounded-xl">
                                    <SelectItem value="Science" className="hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-neutral-900 dark:text-[#ded9ce]">Science</SelectItem>
                                    <SelectItem value="Commerce" className="hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-neutral-900 dark:text-[#ded9ce]">Commerce</SelectItem>
                                    <SelectItem value="Humanities" className="hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-neutral-900 dark:text-[#ded9ce]">Humanities</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
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
                                  <FormLabel className={labelStyle}>SSLC Registration Number</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="SSLC REG NO"
                                      {...field}
                                      className={cn(inputStyle, "uppercase")}
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="sslcGraduationYear"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={labelStyle}>SSLC Passing Year</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className={inputStyle}>
                                        <SelectValue placeholder="Select Year" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-white dark:bg-[#0c140e] border border-neutral-200 dark:border-[#1b2b20] text-neutral-900 dark:text-[#ded9ce] shadow-2xl rounded-xl">
                                      {Array.from(
                                        { length: 5 },
                                        (_, i) => new Date().getFullYear() - i
                                      ).map((y) => (
                                        <SelectItem key={y} value={String(y)} className="hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-neutral-900 dark:text-[#ded9ce]">
                                          {y}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
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
                              <FormLabel className={labelStyle}>Previous Islamic Qualification</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. 5th / 7th Standard Madrasa"
                                  {...field}
                                  className={cn(inputStyle, "uppercase")}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="academicEducationQualification"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelStyle}>Last Completed Academic Level</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. 10th Standard / SSLC / CBSE"
                                  {...field}
                                  className={cn(inputStyle, "uppercase")}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500 dark:text-rose-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-5 border-t border-neutral-200 dark:border-[#1b2b20]">
                    {currentStep > 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep((prev) => prev - 1)}
                        className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold text-neutral-800 dark:text-[#ded9ce] bg-neutral-100 dark:bg-white/[0.04] hover:bg-neutral-200 dark:hover:bg-white/[0.08] border border-neutral-300 dark:border-white/10 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="text-xs font-semibold text-neutral-600 dark:text-[#8c887f] hover:text-neutral-950 dark:hover:text-[#ded9ce] px-3 py-2 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    <div className="flex items-center gap-3">
                      {currentStep < 3 ? (
                        <button
                          type="button"
                          onClick={currentStep === 1 ? handleNextStep1 : handleNextStep2}
                          className="inline-flex items-center gap-1.5 px-5 sm:px-6 py-2.5 rounded-full text-xs font-semibold text-white dark:text-[#07160d] bg-[#1a2217] dark:bg-[#f7f5ee] hover:bg-black dark:hover:bg-white shadow-[0_4px_16px_rgba(26,34,23,0.18)] dark:shadow-[0_4px_16px_rgba(247,245,238,0.12)] transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <span>Next Step</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={uploading}
                          className="inline-flex items-center gap-2 px-6 sm:px-7 py-2.5 rounded-full text-xs font-semibold text-white dark:text-[#07160d] bg-[#1a2217] dark:bg-[#f7f5ee] hover:bg-black dark:hover:bg-white shadow-[0_4px_16px_rgba(26,34,23,0.18)] dark:shadow-[0_4px_16px_rgba(247,245,238,0.12)] hover:shadow-[0_6px_24px_rgba(26,34,23,0.25)] dark:hover:shadow-[0_6px_28px_rgba(247,245,238,0.22)] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                          {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:text-[#07160d]" />}
                          <span>Submit Application</span>
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
