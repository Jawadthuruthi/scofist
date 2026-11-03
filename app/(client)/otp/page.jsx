"use client";
import { Suspense } from "react";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Loader, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function OTPVerificationContent() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("/dashboard");
  const [otpError, setOtpError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Auto-close Resend Success Dialog
  useEffect(() => {
    if (resendSuccess) {
      const timer = setTimeout(() => {
        setResendSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [resendSuccess]);

  // Auto-redirect for Verification Success
  useEffect(() => {
    if (verifySuccess) {
      const timer = setTimeout(() => {
        setVerifySuccess(false);
        router.push(redirectUrl);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [verifySuccess, router, redirectUrl]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setOtpError("");
    try {
      setLoading(true);
      const res = await axios.post("/api/auth/verifyOTP", { email, otp });
      
      const userRoles = res.data.roles || [];
      const primaryRole = userRoles[0];
      if (userRoles.includes("Teacher")) {
        setRedirectUrl("/dashboard/my-periods");
      } else if (userRoles.includes("Judge") || primaryRole === "Judge") {
        setRedirectUrl("/judge-portal");
      } else if (userRoles.includes("Librarian") || primaryRole === "Librarian") {
        setRedirectUrl("/library-dashboard");
      } else if (userRoles.includes("Gate Keeper") || primaryRole === "Gate Keeper") {
        setRedirectUrl("/dashboard/gate-pass");
      } else if (userRoles.includes("Org Admin") || primaryRole === "Org Admin") {
        setRedirectUrl("/dashboard/accounts");
      } else if (userRoles.includes("Literary Leader") || primaryRole === "Literary Leader") {
        setRedirectUrl("/dashboard/literary-attendance");
      } else if (userRoles.includes("Program Committee") || primaryRole === "Program Committee") {
        setRedirectUrl("/dashboard/results");
      } else if (userRoles.includes("Program Leader") || primaryRole === "Program Leader") {
        setRedirectUrl("/dashboard/program-registration");
      } else {
        setRedirectUrl("/dashboard");
      }
      
      setVerifySuccess(true);
    } catch (error) {
      console.error("Error verifying OTP:", error.message);
      setOtpError(error?.response?.data?.message || "Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPResend = async (e) => {
    e.preventDefault();
    setOtpError("");
    setResendLoading(true);
    try {
      await axios.post("/api/auth/sendOTP", { email });
      setResendSuccess(true);
      setCountdown(300);
    } catch (error) {
      console.error("Error resending OTP:", error.message);
      setOtpError(error?.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const [settings, setSettings] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState("");

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
            {settings?.institution?.logo?.url && (
              <img
                src={settings.institution.logo.url}
                alt={settings?.institution?.name || "Institution Logo"}
                className="h-16 w-auto object-contain shrink-0"
              />
            )}
            <CardTitle className="text-xl font-black tracking-tight text-gray-900 leading-tight text-left">
              {settings?.institution?.name === "Sa-adiya College of Integrated Studies" ? (
                <>
                  Sa-adiya College of <br /> Integrated Studies
                </>
              ) : (
                settings?.institution?.name || "Institution"
              )}
            </CardTitle>
          </div>
          <p className="text-sm text-center text-gray-500 font-bold tracking-wide uppercase">
            Verify Access
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="flex flex-col items-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
                autoFocus
                className="mx-auto"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              {otpError && (
                <p className="mt-4 text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1 text-center">
                  {otpError}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader className="animate-spin mr-2" />
              ) : (
                "Verify OTP"
              )}
            </Button>
            <p className="text-sm text-center text-gray-600">
              OTP sent to your email, expires in{" "}
              <span className="font-semibold text-gray-800">
                {formatTime(countdown)}
              </span>
              .
            </p>
            <Button
              onClick={handleOTPResend}
              disabled={resendLoading || countdown > 0}
              variant="outline"
              className={`w-full flex items-center justify-center ${
                countdown > 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {resendLoading ? (
                <>
                  <Loader className="animate-spin mr-2 h-4 w-4" /> Resending...
                </>
              ) : (
                "Resend OTP"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={resendSuccess} onOpenChange={setResendSuccess}>
        <AlertDialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-sm min-h-[220px] [&>button.absolute]:hidden flex flex-col p-0 gap-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 space-y-0 bg-gray-50/80 sticky top-0 z-20 backdrop-blur-md shrink-0 border-b">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <AlertDialogTitle className="text-xl font-bold m-0 text-emerald-600">
                OTP Resent!
              </AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-xs text-gray-500 font-medium">
                A new verification code has been sent to <span className="font-bold text-gray-800">{email}</span>.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <div className="p-5 bg-gray-50/50 flex-1 flex flex-col justify-center">
            <AlertDialogFooter className="flex-col sm:flex-col gap-2">
              <AlertDialogAction 
                onClick={() => setResendSuccess(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25"
              >
                Okay, I'll check
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={verifySuccess} onOpenChange={setVerifySuccess}>
        <AlertDialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-sm min-h-[220px] [&>button.absolute]:hidden flex flex-col p-0 gap-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 space-y-0 bg-gray-50/80 sticky top-0 z-20 backdrop-blur-md shrink-0 border-b">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <AlertDialogTitle className="text-xl font-bold m-0 text-emerald-600">
                Verified!
              </AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-xs text-gray-500 font-medium">
                Your OTP has been verified successfully. Redirecting you...
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <div className="p-5 bg-gray-50/50 flex-1 flex flex-col items-center justify-center">
             <Loader className="h-6 w-6 text-emerald-500 animate-spin" />
             <p className="text-sm text-gray-500 mt-3 font-medium">Redirecting to Dashboard...</p>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function OTPVerification() {
  return (
    <Suspense fallback={null}>
      <OTPVerificationContent />
    </Suspense>
  );
}