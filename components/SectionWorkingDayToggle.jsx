"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader, BookOpen, GraduationCap, Layers, History, Calendar } from "lucide-react";

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
            className="h-8 text-sm bg-white dark:bg-slate-900 w-full"
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SectionWorkingDayToggle({ apiKey, general }) {
  const [bothOn, setBothOn] = useState(general?.isWorkingDay !== false);
  const [bothOccasion, setBothOccasion] = useState(general?.occasion || "");

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
  
  const [loading, setLoading] = useState(false);

  // Compute history data
  const historyData = [];
  
  const nonWorkingLogDates = new Map();
  if (general?.nonWorkingDaysLog) {
    general.nonWorkingDaysLog.forEach(log => {
      try {
        const dateStr = new Date(log.date).toISOString().split('T')[0];
        nonWorkingLogDates.set(dateStr, { date: log.date, occasion: log.occasion });
      } catch (e) {}
    });
  }
  
  const seniorDates = new Map();
  if (general?.seniorDaawaNonWorkingDays) {
    general.seniorDaawaNonWorkingDays.forEach(date => {
      try {
        const dateStr = new Date(date).toISOString().split('T')[0];
        seniorDates.set(dateStr, { date });
      } catch (e) {}
    });
  }
  if (general?.seniorDaawaNonWorkingDaysLog) {
    general.seniorDaawaNonWorkingDaysLog.forEach(log => {
      try {
        const dateStr = new Date(log.date).toISOString().split('T')[0];
        if (seniorDates.has(dateStr)) {
          seniorDates.get(dateStr).occasion = log.occasion;
        }
      } catch (e) {}
    });
  }
  
  const juniorDates = new Map();
  if (general?.juniorDaawaNonWorkingDays) {
    general.juniorDaawaNonWorkingDays.forEach(date => {
      try {
        const dateStr = new Date(date).toISOString().split('T')[0];
        juniorDates.set(dateStr, { date });
      } catch (e) {}
    });
  }
  if (general?.juniorDaawaNonWorkingDaysLog) {
    general.juniorDaawaNonWorkingDaysLog.forEach(log => {
      try {
        const dateStr = new Date(log.date).toISOString().split('T')[0];
        if (juniorDates.has(dateStr)) {
          juniorDates.get(dateStr).occasion = log.occasion;
        }
      } catch (e) {}
    });
  }

  const now = new Date();
  const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const todayDS = `${todayIST.getUTCFullYear()}-${String(todayIST.getUTCMonth() + 1).padStart(2, "0")}-${String(todayIST.getUTCDate()).padStart(2, "0")}`;

  const backfillMissingUI = (dateMap, isOff, occasionStr) => {
    if (!isOff) return;
    if (dateMap.size === 0) {
      dateMap.set(todayDS, { date: new Date(`${todayDS}T00:00:00.000Z`), occasion: occasionStr });
      return;
    }
    const dates = Array.from(dateMap.keys()).sort();
    const latestDate = dates[dates.length - 1];
    
    let curr = new Date(`${latestDate}T00:00:00.000Z`);
    curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
    const end = new Date(`${todayDS}T00:00:00.000Z`);
    while (curr <= end) {
      const ds = `${curr.getUTCFullYear()}-${String(curr.getUTCMonth() + 1).padStart(2, "0")}-${String(curr.getUTCDate()).padStart(2, "0")}`;
      if (!dateMap.has(ds)) {
        dateMap.set(ds, { date: new Date(curr), occasion: occasionStr });
      }
      curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
    }
  };

  backfillMissingUI(nonWorkingLogDates, general?.isWorkingDay === false, general?.occasion || "Not specified");
  backfillMissingUI(seniorDates, general?.seniorDaawa?.isWorkingDay === false, general?.seniorDaawa?.occasion || "Not specified");
  backfillMissingUI(juniorDates, general?.juniorDaawa?.isWorkingDay === false, general?.juniorDaawa?.occasion || "Not specified");
  
  const allDateStrs = new Set([...nonWorkingLogDates.keys(), ...seniorDates.keys(), ...juniorDates.keys()]);
  
  allDateStrs.forEach(dateStr => {
    const inLog = nonWorkingLogDates.has(dateStr);
    const inSenior = seniorDates.has(dateStr);
    const inJunior = juniorDates.has(dateStr);
    
    let dateObj = new Date(`${dateStr}T00:00:00.000Z`);
    let occasion = "Not specified";
    let section = "";

    if (inLog) {
      dateObj = nonWorkingLogDates.get(dateStr).date;
      occasion = nonWorkingLogDates.get(dateStr).occasion || "Not specified";
      section = "Both Sections";
    } else if (inSenior && inJunior) {
      dateObj = seniorDates.get(dateStr).date;
      const sOccasion = seniorDates.get(dateStr).occasion || "Not specified";
      const jOccasion = juniorDates.get(dateStr).occasion || "Not specified";
      occasion = sOccasion === jOccasion ? sOccasion : `${sOccasion} / ${jOccasion}`;
      section = "Both Sections";
    } else if (inSenior) {
      dateObj = seniorDates.get(dateStr).date;
      occasion = seniorDates.get(dateStr).occasion || "Not specified";
      section = "Senior Da-awa";
    } else if (inJunior) {
      dateObj = juniorDates.get(dateStr).date;
      occasion = juniorDates.get(dateStr).occasion || "Not specified";
      section = "Junior Da-awa";
    }
    
    if (section) {
      historyData.push({
        date: dateObj,
        occasion,
        section
      });
    }
  });

  historyData.sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleBothToggle = (checked) => {
    setBothOn(checked);
    setSeniorOn(checked);
    setJuniorOn(checked);
    if (checked) {
      setBothOccasion("");
      setSeniorOccasion("");
      setJuniorOccasion("");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await patchSettings(
        {
          isWorkingDay: bothOn,
          occasion: bothOn ? "" : bothOccasion,
          seniorDaawa_isWorkingDay: seniorOn,
          seniorDaawa_occasion: seniorOn ? "" : seniorOccasion,
          juniorDaawa_isWorkingDay: juniorOn,
          juniorDaawa_occasion: juniorOn ? "" : juniorOccasion,
        },
        apiKey
      );
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-6 pb-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Working Days</h2>
            <p className="text-sm text-muted-foreground">Manage working days for all sections</p>
          </div>
          <div className="flex gap-2 items-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="rounded-2xl sm:rounded-2xl max-w-md max-h-[80vh] flex flex-col overflow-hidden p-0 gap-0">
              <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0" style={{ background: `#64748b10` }}>
                <div className="p-2 rounded-lg" style={{ background: `#64748b20` }}>
                  <History className="w-5 h-5 text-[#64748b]" />
                </div>
                <DialogTitle className="font-semibold text-lg flex-1 m-0 text-left">Non-Working Days History</DialogTitle>
              </DialogHeader>
              <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                {historyData.length > 0 ? (
                  historyData.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between border-b pb-3 last:border-0">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(item.date).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Occasion: {item.occasion}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.section}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No history found.
                  </p>
                )}
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <SectionCard
              label="Both Sections"
              icon={Layers}
              isWorkingDay={bothOn}
              occasion={bothOccasion}
              onToggle={handleBothToggle}
              onOccasionChange={(val) => {
                setBothOccasion(val);
                setSeniorOccasion(val);
                setJuniorOccasion(val);
              }}
              loading={loading}
            />
            <SectionCard
              label="Senior Da-awa"
              icon={GraduationCap}
              isWorkingDay={seniorOn}
              occasion={seniorOccasion}
              onToggle={(checked) => {
                setSeniorOn(checked);
                if (!checked && !juniorOn) setBothOn(false);
                else if (checked && juniorOn) setBothOn(true);
              }}
              onOccasionChange={setSeniorOccasion}
              loading={loading}
            />
            <SectionCard
              label="Junior Da-awa"
              icon={BookOpen}
              isWorkingDay={juniorOn}
              occasion={juniorOccasion}
              onToggle={(checked) => {
                setJuniorOn(checked);
                if (!checked && !seniorOn) setBothOn(false);
                else if (checked && seniorOn) setBothOn(true);
              }}
              onOccasionChange={setJuniorOccasion}
              loading={loading}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-6 pb-6 pt-0 flex flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">
          When a section is <strong>Off</strong>, its periods are hidden in Today&apos;s Schedule and My Periods,
          and teachers will not be counted as absent for those periods today.
          Past days&apos; records are never affected.
        </p>
        <Button size="sm" onClick={handleSave} disabled={loading} className="shrink-0">
          {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          <span className="hidden sm:inline">Save changes</span>
          <span className="sm:hidden">Save</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
