"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader, BookOpen, GraduationCap, PowerOff, Power } from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── Single section card ──────────────────────────────────────────────────────

function SectionCard({
  label,
  icon: Icon,
  isWorkingDay,
  occasion,
  onToggle,
  onOccasionChange,
  onSave,
  loading,
}) {
  const isOn = isWorkingDay !== false;

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all duration-300 ${
        isOn
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          : "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded-lg ${
              isOn
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">{label}</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs font-medium px-2 py-0.5 ${
              isOn
                ? "border-green-400 text-green-700 dark:text-green-300"
                : "border-orange-400 text-orange-700 dark:text-orange-300"
            }`}
          >
            {isOn ? "Working Day" : "Day Off"}
          </Badge>
          <Switch
            checked={isOn}
            onCheckedChange={onToggle}
            disabled={loading}
            aria-label={`Toggle ${label} working day`}
          />
        </div>
      </div>

      {/* Occasion input — shown when off */}
      {!isOn && (
        <div className="flex gap-2 mt-2">
          <Input
            id={`occasion-${label.replace(/\s+/g, "-").toLowerCase()}`}
            placeholder="Occasion (e.g. Exam, Holiday…)"
            value={occasion || ""}
            onChange={(e) => onOccasionChange(e.target.value)}
            className="h-8 text-sm bg-white dark:bg-slate-900"
            disabled={loading}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={loading}
            className="h-8 px-3 shrink-0"
            aria-label={`Save ${label} occasion`}
          >
            {loading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SectionWorkingDayToggle({ apiKey, general }) {
  const [seniorOn, setSeniorOn] = useState(
    general?.seniorDaawa?.isWorkingDay !== false
  );
  const [juniorOn, setJuniorOn] = useState(
    general?.juniorDaawa?.isWorkingDay !== false
  );
  const [seniorOccasion, setSeniorOccasion] = useState(
    general?.seniorDaawa?.occasion || ""
  );
  const [juniorOccasion, setJuniorOccasion] = useState(
    general?.juniorDaawa?.occasion || ""
  );
  const [seniorLoading, setSeniorLoading] = useState(false);
  const [juniorLoading, setJuniorLoading] = useState(false);
  const [bothLoading, setBothLoading] = useState(false);

  // ── Senior toggle ──────────────────────────────────────────────────────────
  const handleSeniorToggle = useCallback(
    async (checked) => {
      setSeniorLoading(true);
      try {
        await patchSettings(
          {
            seniorDaawa_isWorkingDay: checked,
            ...(checked ? {} : { seniorDaawa_occasion: seniorOccasion }),
          },
          apiKey
        );
        setSeniorOn(checked);
        if (checked) setSeniorOccasion("");
        toast.success(
          checked
            ? "Senior Da-awa marked as Working Day"
            : "Senior Da-awa marked as Day Off"
        );
      } catch (err) {
        toast.error(err.message);
      } finally {
        setSeniorLoading(false);
      }
    },
    [apiKey, seniorOccasion]
  );

  const handleSeniorOccasionSave = useCallback(async () => {
    setSeniorLoading(true);
    try {
      await patchSettings({ seniorDaawa_occasion: seniorOccasion }, apiKey);
      toast.success("Senior Da-awa occasion saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSeniorLoading(false);
    }
  }, [apiKey, seniorOccasion]);

  // ── Junior toggle ──────────────────────────────────────────────────────────
  const handleJuniorToggle = useCallback(
    async (checked) => {
      setJuniorLoading(true);
      try {
        await patchSettings(
          {
            juniorDaawa_isWorkingDay: checked,
            ...(checked ? {} : { juniorDaawa_occasion: juniorOccasion }),
          },
          apiKey
        );
        setJuniorOn(checked);
        if (checked) setJuniorOccasion("");
        toast.success(
          checked
            ? "Junior Da-awa marked as Working Day"
            : "Junior Da-awa marked as Day Off"
        );
      } catch (err) {
        toast.error(err.message);
      } finally {
        setJuniorLoading(false);
      }
    },
    [apiKey, juniorOccasion]
  );

  const handleJuniorOccasionSave = useCallback(async () => {
    setJuniorLoading(true);
    try {
      await patchSettings({ juniorDaawa_occasion: juniorOccasion }, apiKey);
      toast.success("Junior Da-awa occasion saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJuniorLoading(false);
    }
  }, [apiKey, juniorOccasion]);

  // ── Both Off ───────────────────────────────────────────────────────────────
  const handleBothOff = useCallback(async () => {
    setBothLoading(true);
    try {
      await patchSettings(
        {
          seniorDaawa_isWorkingDay: false,
          juniorDaawa_isWorkingDay: false,
        },
        apiKey
      );
      setSeniorOn(false);
      setJuniorOn(false);
      toast.success("Both sections marked as Day Off");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBothLoading(false);
    }
  }, [apiKey]);

  // ── Both On ────────────────────────────────────────────────────────────────
  const handleBothOn = useCallback(async () => {
    setBothLoading(true);
    try {
      await patchSettings(
        {
          seniorDaawa_isWorkingDay: true,
          juniorDaawa_isWorkingDay: true,
        },
        apiKey
      );
      setSeniorOn(true);
      setJuniorOn(true);
      setSeniorOccasion("");
      setJuniorOccasion("");
      toast.success("Both sections marked as Working Day");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBothLoading(false);
    }
  }, [apiKey]);

  const bothAreOff = !seniorOn && !juniorOn;
  const bothAreOn = seniorOn && juniorOn;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      {/* Card header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-base">Section Working Days</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toggle working day status for each Da-awa section independently
          </p>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={bothAreOff ? "destructive" : "outline"}
            onClick={handleBothOff}
            disabled={bothLoading || bothAreOff}
            className="h-8 gap-1.5 text-xs"
            aria-label="Mark both sections as day off"
          >
            {bothLoading ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PowerOff className="h-3.5 w-3.5" />
            )}
            Both Off
          </Button>
          <Button
            size="sm"
            variant={bothAreOn ? "default" : "outline"}
            onClick={handleBothOn}
            disabled={bothLoading || bothAreOn}
            className="h-8 gap-1.5 text-xs"
            aria-label="Mark both sections as working day"
          >
            {bothLoading ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            Both On
          </Button>
        </div>
      </div>

      {/* Section cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SectionCard
          label="Senior Da-awa"
          icon={GraduationCap}
          isWorkingDay={seniorOn}
          occasion={seniorOccasion}
          onToggle={handleSeniorToggle}
          onOccasionChange={setSeniorOccasion}
          onSave={handleSeniorOccasionSave}
          loading={seniorLoading}
        />
        <SectionCard
          label="Junior Da-awa"
          icon={BookOpen}
          isWorkingDay={juniorOn}
          occasion={juniorOccasion}
          onToggle={handleJuniorToggle}
          onOccasionChange={setJuniorOccasion}
          onSave={handleJuniorOccasionSave}
          loading={juniorLoading}
        />
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground border-t pt-3">
        When a section is <strong>Off</strong>, its periods are hidden in Today&apos;s Schedule and My Periods,
        and teachers will not be counted as absent for those periods today.
        Past days&apos; records are never affected.
      </p>
    </div>
  );
}
