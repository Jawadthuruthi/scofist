"use client";

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
import { Loader } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export default function OTPVerification() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(300);
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
    try {
      setLoading(true);
      await axios.post("/api/auth/verifyOTP", { email, otp });
      toast.success("OTP verified successfully!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Error verifying OTP:", error.message);
      toast.error(
        error?.response?.data?.message ||
          "Failed to verify OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPResend = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    try {
      await axios.post("/api/auth/sendOTP", { email });
      toast.success(
        "OTP resent successfully!. Please check your email for OTP."
      );
    } catch (error) {
      console.error("Error resending OTP:", error.message);
      toast.error(
        error?.response?.data?.message ||
          "Failed to resend OTP. Please try again."
      );
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
        <CardHeader className="text-center">
          {settings?.institution?.logo?.url && (
            <div className="flex justify-center mb-4">
              <img
                src={settings.institution.logo.url}
                alt={settings.institution.name}
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          <CardTitle className="text-center text-2xl font-black">
            Verify Access
          </CardTitle>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            {settings?.institution?.name || "Institution"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="flex flex-col items-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
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
    </div>
  );
}
