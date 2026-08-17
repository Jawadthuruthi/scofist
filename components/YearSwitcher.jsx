"use client";

import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Edit2, Trash2, Settings2, Lock, Unlock, X } from "lucide-react";
import Cookies from "js-cookie";
import axios from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

const YearSwitcher = ({ initialData, activeRole, initialActiveYear }) => {
  const [years, setYears] = useState(initialData?.years || []);
  const [blockedYears, setBlockedYears] = useState(initialData?.blockedYears || []);
  // initialActiveYear is resolved on the server (from cookie + settings logic)
  // so the initial render is identical between SSR and client hydration.
  const [activeYear, setActiveYear] = useState(initialActiveYear || "");
  const [newYear, setNewYear] = useState("");
  const [loading, setLoading] = useState(!initialData); // skip skeleton if server data provided
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    // Always fetch in background to keep data fresh for mutation actions
    // If we already had initialData, don't show loading skeleton
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get("/api/settings");
      const settings = response.data.settings;
      const fetchedYears = settings.years || ["2025 november"];
      const fetchedBlockedYears = settings.blockedYears || [];
      setYears(fetchedYears);
      setBlockedYears(fetchedBlockedYears);

      const recentYear = fetchedYears.length > 0 ? fetchedYears[fetchedYears.length - 1] : "2025 november";
      let currentYear = Cookies.get("active-year");

      if (activeRole === "Program Committee" || activeRole === "Program Leader") {
        if (!currentYear) currentYear = recentYear;
      } else {
        if (!currentYear) currentYear = settings.activeYear || recentYear;
      }

      if (fetchedYears.length > 0 && !fetchedYears.includes(currentYear)) {
        currentYear = recentYear;
      }

      if ((activeRole === "Program Leader" || activeRole === "Program Committee") && fetchedBlockedYears.includes(currentYear)) {
        const unblockedYears = fetchedYears.filter(y => !fetchedBlockedYears.includes(y));
        currentYear = unblockedYears.length > 0 ? unblockedYears[unblockedYears.length - 1] : currentYear;
      }

      setActiveYear(currentYear);

      if (!Cookies.get("active-year") || Cookies.get("active-year") !== currentYear) {
        Cookies.set("active-year", currentYear, { expires: 365, path: "/" });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (value) => {
    setActiveYear(value);
    Cookies.set("active-year", value, { expires: 365, path: "/" });
    window.location.reload();
  };

  const handleToggleBlockYear = async (year) => {
    try {
      const isBlocked = blockedYears.includes(year);
      const updatedBlockedYears = isBlocked
        ? blockedYears.filter((y) => y !== year)
        : [...blockedYears, year];
        
      await axios.put("/api/settings", { blockedYears: updatedBlockedYears });
      setBlockedYears(updatedBlockedYears);
      toast.success(isBlocked ? "Year unblocked" : "Year blocked");
    } catch (error) {
      toast.error("Failed to update block status");
    }
  };

  const handleAddYear = async () => {
    if (!newYear.trim()) return;
    if (years.includes(newYear.trim())) {
      toast.error("Year already exists");
      return;
    }

    try {
      const updatedYears = [...years, newYear.trim()];
      await axios.put("/api/settings", { years: updatedYears });
      setYears(updatedYears);
      
      // Automatically select the newly added year
      setActiveYear(newYear.trim());
      Cookies.set("active-year", newYear.trim(), { expires: 365, path: "/" });
      
      setNewYear("");
      toast.success("Year added successfully");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to add year");
    }
  };

  const handleRenameYear = async (oldName) => {
    if (!editValue.trim() || oldName === editValue.trim()) {
      setEditingYear(null);
      return;
    }

    if (years.includes(editValue.trim())) {
      toast.error("Year name already exists");
      return;
    }

    try {
      toast.loading("Renaming year and updating data...", { id: "rename" });
      await axios.put("/api/settings/rename-year", {
        oldName,
        newName: editValue.trim(),
      });

      const updatedYears = years.map((y) =>
        y === oldName ? editValue.trim() : y
      );
      setYears(updatedYears);
      if (activeYear === oldName) {
        setActiveYear(editValue.trim());
        Cookies.set("active-year", editValue.trim(), {
          expires: 365,
          path: "/",
        });
      }
      setEditingYear(null);
      toast.success("Year renamed successfully", { id: "rename" });
      window.location.reload();
    } catch (error) {
      toast.error("Failed to rename year", { id: "rename" });
    }
  };

  const handleDeleteYear = async (yearToDelete) => {
    if (years.length <= 1) {
      toast.error("At least one year must remain");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${yearToDelete}"? This will NOT delete the associated data, but the year will no longer be selectable.`
      )
    ) {
      return;
    }

    try {
      const updatedYears = years.filter((y) => y !== yearToDelete);
      const updatePayload = { years: updatedYears };

      if (activeYear === yearToDelete) {
        updatePayload.activeYear = updatedYears[0];
        Cookies.set("active-year", updatedYears[0], {
          expires: 365,
          path: "/",
        });
      }

      await axios.put("/api/settings", updatePayload);
      setYears(updatedYears);
      toast.success("Year removed from list");
      if (activeYear === yearToDelete) window.location.reload();
    } catch (error) {
      toast.error("Failed to delete year");
    }
  };

  if (loading)
    return <div className="h-10 animate-pulse bg-muted rounded-md mx-4 my-4" />;

  return (
    <div className="space-y-3 pb-4 border-b">
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Festival Session
          </label>
          {activeRole !== "Program Leader" && activeRole !== "Judge" && (
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-primary"
                >
                  <Settings2 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:rounded-2xl max-w-md max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden overflow-hidden p-0 flex flex-col gap-0">
                <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left space-y-0.5">
                    <DialogTitle className="text-xl font-bold m-0">Manage Festival Sessions</DialogTitle>
                    <DialogDescription className="m-0">
                      Add, rename, block, or delete festival years.
                    </DialogDescription>
                  </div>
                  <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                    <X className="h-5 w-5" />
                  </DialogClose>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="New Year (e.g. 2026)"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddYear()}
                  />
                  <Button
                    onClick={handleAddYear}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Session
                  </Button>
                  </div>
                  <div className="space-y-4">
                  {years.map((year) => (
                    <div
                      key={year}
                      className="flex items-center justify-between gap-4 p-2 rounded-lg border bg-muted/30"
                    >
                      {editingYear === year ? (
                        <div className="flex flex-1 gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleRenameYear(year)
                            }
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => handleRenameYear(year)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => setEditingYear(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-sm">{year} {blockedYears.includes(year) && <span className="text-xs text-red-500 ml-2">(Blocked)</span>}</span>
                          <div className="flex items-center gap-1">
                            {activeRole === "Program Committee" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleToggleBlockYear(year)}
                              >
                                {blockedYears.includes(year) ? (
                                  <Unlock className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <Lock className="h-4 w-4 text-orange-500" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingYear(year);
                                setEditValue(year);
                              }}
                            >
                              <Edit2 className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteYear(year)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Select value={activeYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-full bg-background border-muted-foreground/20 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <Calendar className="h-4 w-4 shrink-0 text-primary" />
              <SelectValue placeholder="Select Year" />
            </div>
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            {years.filter(y => !blockedYears.includes(y)).map((year) => (
              <SelectItem key={year} value={year} className="cursor-pointer">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


    </div>
  );
};

export default YearSwitcher;
