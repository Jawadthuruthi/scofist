"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Mail, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [settings, setSettings] = useState(null);
  const [showMobileNumber, setShowMobileNumber] = useState(false);

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

  const handleSendOTP = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post("/api/auth/sendOTP", { email });
      toast.success("OTP sent successfully!");
      setTimeout(() => {
        router.push(`/otp?email=${encodeURIComponent(email)}`);
      }, 1000);
    } catch (error) {
      console.error("Error sending OTP:", error.message);
      toast.error(
        error?.response?.data?.message ||
        "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post("/api/auth/student-login", { studentId, mobileNumber });
      toast.success("Login successful!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Error logging in:", error.message);
      toast.error(
        error?.response?.data?.message || "Failed to login. Please try again."
      );
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
        <CardHeader className="space-y-4 pb-2 text-center">
          {institutionLogo && (
            <div className="flex justify-center mb-2 animate-in slide-in-from-top duration-700 delay-200">
              <img
                src={institutionLogo}
                alt={institutionName || "Institution Logo"}
                className="h-20 w-auto object-contain drop-shadow-md"
              />
            </div>
          )}
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight text-gray-900">
              {institutionName || "Sign In"}
            </CardTitle>
            <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">
              Official Access Portal
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="otp" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="otp">OTP Login</TabsTrigger>
              <TabsTrigger value="student">Student Login</TabsTrigger>
            </TabsList>
            <TabsContent value="otp">
              <form onSubmit={handleSendOTP} className="space-y-4 pt-4">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
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
                    type="text"
                    placeholder="Enter Student ID"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Mobile Number</Label>
                  <div className="relative">
                    <Input
                      type={showMobileNumber ? "text" : "password"}
                      placeholder="Enter Mobile Number"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMobileNumber(!showMobileNumber)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showMobileNumber ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader className="animate-spin mr-2" /> : "Login"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
