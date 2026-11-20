"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Mail, Calendar as CalendarIcon, ChevronLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import axios from "axios";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [settings, setSettings] = useState(null);
  const [otpSentSuccess, setOtpSentSuccess] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState({
    otp: "",
    student: ""
  });

  const [activeTab, setActiveTab] = useState("otp");
  const emailInputRef = useRef(null);
  const studentIdInputRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (activeTab === "otp" && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (activeTab === "student" && studentIdInputRef.current) {
        studentIdInputRef.current.focus();
      }
    }, 50);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get("/api/settings");
        const data = response.data.settings;
        setSettings(data);
        const photoUrl = data?.institution?.institutionPhoto?.url;
        if (photoUrl) {
          setBackgroundImage(photoUrl);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Auto-redirect for OTP Sent
  useEffect(() => {
    if (otpSentSuccess) {
      const timer = setTimeout(() => {
        setOtpSentSuccess(false);
        router.push(`/otp?email=${encodeURIComponent(email)}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [otpSentSuccess, email, router]);

  // Auto-redirect for Student Login Success
  useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        setLoginSuccess(false);
        router.push("/dashboard");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess, router]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setFormErrors(prev => ({ ...prev, otp: "" }));
    try {
      setLoading(true);
      await axios.post("/api/auth/sendOTP", { email });
      setOtpSentSuccess(true);
    } catch (error) {
      console.error("Error sending OTP:", error.message);
      setFormErrors(prev => ({
        ...prev,
        otp: error?.response?.data?.message || "Failed to send OTP. Please try again."
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setFormErrors(prev => ({ ...prev, student: "" }));
    try {
      setLoading(true);
      await axios.post("/api/auth/student-login", { studentId, dateOfBirth });
      setLoginSuccess(true);
    } catch (error) {
      console.error("Error logging in:", error.message);
      setFormErrors(prev => ({
        ...prev,
        student: error?.response?.data?.message || "Failed to login. Please try again."
      }));
    } finally {
      setLoading(false);
    }
  };

  const institutionLogo = settings?.institution?.logo?.url;
  const institutionName = settings?.institution?.name;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-[#080c09] text-[#ded9ce] selection:bg-emerald-900/50 selection:text-emerald-100 font-sans"
    >
      {/* Subtle atmospheric ground */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(1000px 500px at 50% -80px, rgba(20, 80, 50, 0.3), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {backgroundImage && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-10 filter blur-[2px]"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          aria-hidden="true"
        />
      )}

      <Card className="z-10 w-full max-w-md shadow-2xl bg-[#0c140e]/95 backdrop-blur-2xl border border-white/[0.08] text-[#ded9ce] rounded-2xl animate-in fade-in zoom-in duration-500">
        <CardHeader className="pb-2 space-y-4 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            {institutionLogo && (
              <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 p-1 flex items-center justify-center shadow-inner">
                <img
                  src={institutionLogo}
                  alt={institutionName || "Institution Logo"}
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
            )}
            <CardTitle className="text-2xl font-normal text-[#f7f5ee] font-['Playfair_Display',serif] tracking-tight">
              {institutionName || "Official Access Portal"}
            </CardTitle>
          </div>
          <p className="text-xs text-center text-[#9ca59a] font-normal tracking-wide">
            Student, Scholar & Faculty Management System
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 rounded-full bg-white/[0.03] border border-white/[0.08]">
              <TabsTrigger 
                value="otp"
                className="rounded-full text-xs font-medium text-[#9ca59a] data-[state=active]:bg-[#f7f5ee] data-[state=active]:text-[#07160d] transition-all"
              >
                Email Access
              </TabsTrigger>
              <TabsTrigger 
                value="student"
                className="rounded-full text-xs font-medium text-[#9ca59a] data-[state=active]:bg-[#f7f5ee] data-[state=active]:text-[#07160d] transition-all"
              >
                Student ID
              </TabsTrigger>
            </TabsList>
            <TabsContent value="otp">
              <form onSubmit={handleSendOTP} className="space-y-4 pt-4">
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-medium text-[#ded9ce]">Registered Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8f9b8a] w-4 h-4" />
                    <Input
                      ref={emailInputRef}
                      type="email"
                      placeholder="you@institution.edu"
                      required
                      autoFocus
                      className={`pl-10 bg-white/[0.03] border-white/10 text-[#f7f5ee] placeholder:text-[#6e786b] focus-visible:ring-emerald-500/50 rounded-xl ${formErrors.otp ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                {formErrors.otp && (
                  <p className="text-xs font-medium text-red-400">
                    {formErrors.otp}
                  </p>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-full bg-[#f7f5ee] hover:bg-white text-[#07160d] font-semibold text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer" 
                  disabled={loading}
                >
                  {loading ? (
                    <Loader className="animate-spin mr-2 w-4 h-4" />
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4 pt-4">
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-medium text-[#ded9ce]">Student ID</Label>
                  <Input
                    ref={studentIdInputRef}
                    type="text"
                    placeholder="Enter Student ID"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className={`uppercase bg-white/[0.03] border-white/10 text-[#f7f5ee] placeholder:text-[#6e786b] focus-visible:ring-emerald-500/50 rounded-xl ${formErrors.student ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-medium text-[#ded9ce]">Date of Birth</Label>
                  <div className="relative flex items-center">
                    <Input
                      type="text"
                      placeholder="DD-MM-YYYY"
                      required
                      value={dateOfBirth}
                      onChange={(e) => {
                        const isDeleting = e.nativeEvent.inputType === "deleteContentBackward" ||
                                           e.nativeEvent.inputType === "deleteContentForward";
                        const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
                        let val;
                        if (digits.length <= 2) {
                          val = digits + (digits.length === 2 && !isDeleting ? "-" : "");
                        } else if (digits.length <= 4) {
                          val = digits.slice(0, 2) + "-" + digits.slice(2) +
                                (digits.length === 4 && !isDeleting ? "-" : "");
                        } else {
                          val = digits.slice(0, 2) + "-" + digits.slice(2, 4) + "-" + digits.slice(4);
                        }
                        setDateOfBirth(val);
                      }}
                      maxLength={10}
                      className={`pr-10 bg-white/[0.03] border-white/10 text-[#f7f5ee] placeholder:text-[#6e786b] focus-visible:ring-emerald-500/50 rounded-xl ${formErrors.student ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="absolute right-3 text-[#8f9b8a] hover:text-[#f7f5ee] focus:outline-none">
                          <CalendarIcon size={18} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#0c140e] border border-white/10 text-[#ded9ce]" align="end">
                        <Calendar
                          mode="single"
                          selected={(() => {
                            if (dateOfBirth && dateOfBirth.length === 10) {
                              const parts = dateOfBirth.split('-');
                              if (parts.length === 3) {
                                return new Date(parts[2], parts[1] - 1, parts[0]);
                              }
                            }
                            return undefined;
                          })()}
                          onSelect={(date) => {
                            if (date) {
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const year = date.getFullYear();
                              setDateOfBirth(`${day}-${month}-${year}`);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {formErrors.student && (
                  <p className="text-xs font-medium text-red-400">
                    {formErrors.student}
                  </p>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-full bg-[#f7f5ee] hover:bg-white text-[#07160d] font-semibold text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer" 
                  disabled={loading}
                >
                  {loading ? <Loader className="animate-spin mr-2 w-4 h-4" /> : "Sign In to Portal"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="z-10 mt-6 text-center">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs text-[#9ca59a] hover:text-[#f7f5ee] transition-colors px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] hover:border-white/15"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Return to College Home</span>
        </Link>
      </div>

      <AlertDialog open={otpSentSuccess} onOpenChange={setOtpSentSuccess}>
        <AlertDialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-sm min-h-[220px] [&>button.absolute]:hidden flex flex-col p-0 gap-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 space-y-0 bg-gray-50/80 sticky top-0 z-20 backdrop-blur-md shrink-0 border-b">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <AlertDialogTitle className="text-xl font-bold m-0 text-emerald-600">
                OTP Sent!
              </AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-xs text-gray-500 font-medium">
                A verification code has been sent to <span className="font-bold text-gray-800">{email}</span>. Please check your inbox.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <div className="p-5 bg-gray-50/50 flex-1 flex flex-col items-center justify-center">
             <Loader className="h-6 w-6 text-emerald-500 animate-spin" />
             <p className="text-sm text-gray-500 mt-3 font-medium">Preparing Verification...</p>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={loginSuccess} onOpenChange={setLoginSuccess}>
        <AlertDialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-sm min-h-[220px] [&>button.absolute]:hidden flex flex-col p-0 gap-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-gray-50/80 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <AlertDialogTitle className="text-xl font-bold m-0 text-emerald-600">
                Login Successful
              </AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-xs text-gray-500 font-medium">
                Welcome back! Redirecting you...
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <div className="p-5 bg-gray-50/50 flex-1 flex flex-col justify-center">
            <AlertDialogFooter className="flex-col sm:flex-col gap-2">
              <AlertDialogAction 
                onClick={() => {
                  setLoginSuccess(false);
                  window.location.href = "/dashboard";
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25"
              >
                Go to Dashboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

