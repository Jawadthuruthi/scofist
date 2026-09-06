"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ParticipantLoginModal({
  isOpen,
  onClose,
  festivalNameImage,
  onLoginSuccess,
}) {
  const [chestNumber, setChestNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchedImage, setFetchedImage] = useState(null);

  useEffect(() => {
    if (!festivalNameImage && isOpen) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          const img =
            data?.settings?.festival?.festivalNameImage?.url ||
            data?.settings?.festivals?.[0]?.festivalNameImage?.url;
          if (img) setFetchedImage(img);
        })
        .catch(() => {});
    }
  }, [festivalNameImage, isOpen]);

  if (!isOpen) return null;

  const resolvedFestivalNameImage =
    (typeof festivalNameImage === "string" ? festivalNameImage : festivalNameImage?.url) ||
    fetchedImage ||
    "https://res.cloudinary.com/do8vcjig0/image/upload/v1787142796/profiles/q4bwbn3hk21k6zonu5t8.png";

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!chestNumber || !dateOfBirth) {
      setError("Please fill in both fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chestNumber, dateOfBirth }),
      });
      const data = await res.json();

      if (data.success) {
        onLoginSuccess(data.participant);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            {resolvedFestivalNameImage ? (
              <img
                src={resolvedFestivalNameImage}
                alt="Festival Name"
                className="h-16 w-auto max-w-[260px] object-contain mb-4"
              />
            ) : (
              <div className="h-16 flex items-center justify-center mb-4">
                <h2 className="text-2xl font-black text-[#3f2720]">Participant Login</h2>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-800 text-center">
              Welcome back!
            </h3>
            <p className="text-sm text-gray-500 text-center mt-1">
              Enter your Chest Number and Date of Birth.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chest Number
              </label>
              <Input
                type="number"
                placeholder="e.g., 101"
                value={chestNumber}
                onChange={(e) => setChestNumber(e.target.value)}
                required
                className="w-full text-lg py-6 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="w-full text-lg py-6 rounded-xl"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            <div className="pt-2 space-y-2.5">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#3f2720] to-[#9e6237] hover:opacity-90 text-white rounded-xl py-6 text-lg font-semibold shadow-md transition-all"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  "Login"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl py-6 text-base font-semibold transition-all"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
