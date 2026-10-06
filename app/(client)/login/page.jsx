"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Mail, Calendar as CalendarIcon } from "lucide-react";
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
      className="relative flex min-h-screen items-center justify-center p-4 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
      style={
        backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}
      }
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-1000 ${
          backgroundImage ? "opacity-100" : "opacity-0"
        }`}
      />
      <Card className="z-10 w-full max-w-md shadow-2xl bg-white/90 backdrop-blur-xl border-white/20 animate-in fade-in zoom-in duration-500">
        <CardHeader className="pb-2 space-y-4">
          <div className="flex items-center justify-center gap-4 animate-in slide-in-from-top duration-700 delay-200">
            {institutionLogo && (
              <img
                src={institutionLogo}
                alt={institutionName || "Institution Logo"}
                className="h-16 w-auto object-contain shrink-0"
              />
            )}
            <CardTitle className="text-xl font-black tracking-tight text-gray-900 leading-tight text-left">
              {institutionName === "Sa-adiya College of Integrated Studies" ? (
                <>
                  Sa-adiya College of <br /> Integrated Studies
                </>
              ) : (
                institutionName || "Sign In"
              )}
            </CardTitle>
          </div>
          <p className="text-sm text-center text-gray-500 font-bold tracking-wide uppercase">
            Official Access Portal
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="otp">Email Login</TabsTrigger>
              <TabsTrigger value="student">ID Login</TabsTrigger>
            </TabsList>
            <TabsContent value="otp">
              <form onSubmit={handleSendOTP} className="space-y-4 pt-4">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <Input
                      ref={emailInputRef}
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className={`pl-10 ${formErrors.otp ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                {formErrors.otp && (
                  <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                    {formErrors.otp}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader className="animate-spin mr-2" />
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4 pt-4">
                <div className="space-y-1">
                  <Label>Student ID</Label>
                  <Input
                    ref={studentIdInputRef}
                    type="text"
                    placeholder="Enter Student ID"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className={`uppercase ${formErrors.student ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date of Birth</Label>
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
                      className={`pr-10 ${formErrors.student ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none">
                          <CalendarIcon size={18} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
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
                  <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                    {formErrors.student}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader className="animate-spin mr-2" /> : "Login"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
                  router.push("/dashboard");
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

