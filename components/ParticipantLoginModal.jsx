"use client";
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            {festivalNameImage ? (
              <img
                src={festivalNameImage}
                alt="Festival Logo"
                className="h-16 w-auto object-contain mb-4"
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
              Enter your chest number and date of birth to view your participant card.
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#3f2720] to-[#9e6237] hover:opacity-90 text-white rounded-xl py-6 text-lg font-semibold shadow-md transition-all mt-4"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                "View My Card"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
