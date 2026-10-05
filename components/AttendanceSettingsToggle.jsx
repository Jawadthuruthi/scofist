"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader } from "lucide-react";

async function patchSettings(payload, apiKey) {
  const res = await fetch("/api/settings", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update settings");
  }
  return res.json();
}

export default function AttendanceSettingsToggle({ apiKey, general }) {
  const [allowPreviousDayAttendance, setAllowPreviousDayAttendance] = useState(
    general?.allowPreviousDayAttendance !== false
  );
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked) => {
    setAllowPreviousDayAttendance(checked);
    setLoading(true);
    try {
      await patchSettings({ allowPreviousDayAttendance: checked }, apiKey);
      toast.success("Attendance settings saved successfully");
    } catch (err) {
      toast.error(err.message);
      // Revert state if failed
      setAllowPreviousDayAttendance(!checked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader className="p-6 pb-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Attendance Settings</h2>
            <p className="text-sm text-muted-foreground">Manage permissions for marking attendance</p>
          </div>
          {loading && <Loader className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border">
          <div className="space-y-1 pr-4">
            <span className="font-semibold text-sm">Allow Previous Day Attendance</span>
            <p className="text-xs text-muted-foreground">
              If turned off, teachers cannot navigate to previous days to mark or view attendance on their dashboard.
            </p>
          </div>
          <Switch
            checked={allowPreviousDayAttendance}
            onCheckedChange={handleToggle}
            disabled={loading}
            aria-label="Toggle previous day attendance"
          />
        </div>
      </CardContent>
    </Card>
  );
}
