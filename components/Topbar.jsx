"use client";

import { useState, useEffect } from "react";
import { Menu, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import TeacherProfileEditModal from "./TeacherProfileEditModal";
import ProfileEditModal from "./ProfileEditModal";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTheme } from "next-themes";
import PushNotificationToggle from "./PushNotificationToggle";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";

export function Topbar({ user, festival: initialFestival, activeRole: activeRoleProp, hideSidebarToggle = false, settingsData }) {
  const { toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [institution, setInstitution] = useState(null);
  const [festival, setFestival] = useState(initialFestival || null);
  const [activeRole, setActiveRole] = useState(activeRoleProp || null);
  const [imageError, setImageError] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (initialFestival) {
      setFestival(initialFestival);
      setImageError(false);
    }
  }, [initialFestival]);

  useEffect(() => {
    if (activeRoleProp) {
      setActiveRole(activeRoleProp);
    } else if (typeof window !== "undefined") {
      const cookieRole = Cookies.get("active-role");
      if (cookieRole) setActiveRole(cookieRole);
    }
  }, [activeRoleProp]);

  // Handle client-side mounting and festival session detection
  useEffect(() => {
    setMounted(true);

    const loadSettings = async (targetYear) => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (data.settings?.institution) {
          setInstitution(data.settings.institution);
        }

        const role = activeRoleProp || (typeof window !== "undefined" ? Cookies.get("active-role") : null);
        if (role) setActiveRole(role);

        // Resolve current active year
        const currentYear =
          targetYear ||
          (typeof window !== "undefined" ? Cookies.get("active-year") : null) ||
          data.settings?.activeYear;

        // Find festival matching currentYear exactly
        let matchedFest = null;
        if (data.settings?.festivals && data.settings.festivals.length > 0) {
          matchedFest = data.settings.festivals.find((f) => f.year === currentYear);
        }
        if (!matchedFest && data.settings?.festival?.year === currentYear) {
          matchedFest = data.settings.festival;
        }
        if (!matchedFest && data.settings?.festival) {
          matchedFest = data.settings.festival;
        }

        setFestival(matchedFest || null);
        setImageError(false);
      } catch (error) {
        console.error("Error fetching settings in Topbar:", error);
      }
    };

    loadSettings();

    // Listen for festival session change from sidebar
    const handleYearChanged = (event) => {
      const newYear = event?.detail || (typeof window !== "undefined" ? Cookies.get("active-year") : null);
      loadSettings(newYear);
    };

    window.addEventListener("active-year-changed", handleYearChanged);
    return () => {
      window.removeEventListener("active-year-changed", handleYearChanged);
    };
  }, [activeRoleProp]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout");
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Render theme toggle only after component is mounted
  const renderThemeToggle = () => {
    if (!mounted) {
      // Return empty placeholder with same dimensions to maintain layout
      return <div className="w-5 h-5" />;
    }

    return theme === "light" ? (
      <Moon className="w-5 h-5" />
    ) : (
      <Sun className="w-5 h-5" />
    );
  };

  const isJudgePortal = pathname?.startsWith("/judge-portal");
  const effectiveRole =
    activeRole || (typeof window !== "undefined" ? Cookies.get("active-role") : null);

  const rawRoles = user?.roles || [];
  const baseRoles =
    effectiveRole && !rawRoles.includes(effectiveRole)
      ? [...rawRoles, effectiveRole]
      : rawRoles;
  const filteredRoles = baseRoles.filter(
    (r) => r !== "Stationary" && r !== "IT Lab"
  );

  const handleRoleChange = (currentValue) => {
    if (!currentValue || currentValue === effectiveRole) return;
    try {
      Cookies.set("active-role", currentValue, {
        path: "/",
      });
      console.log("Cookie set successfully");
    } catch (error) {
      console.error("Error setting cookie:", error);
    }
    if (currentValue === "Librarian") {
      window.location.href = "/library-dashboard";
    } else if (currentValue === "Gate Keeper") {
      window.location.href = "/dashboard/gate-pass";
    } else if (currentValue === "Judge") {
      window.location.href = "/judge-portal";
    } else if (currentValue === "Teacher") {
      window.location.href = "/dashboard/my-periods";
    } else if (currentValue === "Org Admin") {
      window.location.href = "/dashboard/accounts";
    } else if (currentValue === "Literary Leader") {
      window.location.href = "/dashboard/literary-attendance";
    } else if (currentValue === "Program Committee") {
      window.location.href = "/dashboard/results";
    } else if (currentValue === "Program Leader") {
      window.location.href = "/dashboard/program-registration";
    } else {
      window.location.href = "/dashboard";
    }
  };
  const isStudent = effectiveRole === "Student" || (user?.roles?.includes("Student") && effectiveRole !== "Teacher");
  const isTeacher = !isStudent && (effectiveRole === "Teacher" || user?.roles?.includes("Teacher"));
  const canEditProfile = isTeacher || isStudent;

  const isAllowedRole =
    effectiveRole === "Program Committee" ||
    effectiveRole === "Program Leader" ||
    effectiveRole === "Judge" ||
    isJudgePortal;

  const shouldShowFestival = Boolean(isAllowedRole);

  const festivalFullNameImageUrl =
    festival?.festivalFullNameImage?.url ||
    (typeof festival?.festivalFullNameImage === "string" ? festival.festivalFullNameImage : null) ||
    festival?.festivalNameImage?.url ||
    (typeof festival?.festivalNameImage === "string" ? festival.festivalNameImage : null);

  const festivalDisplayName =
    festival?.festivalInfo?.name ||
    festival?.name ||
    "";

  return (
    <header className="fixed top-0 left-0 w-full z-50 h-14 min-h-14 shrink-0 bg-background border-b shadow-sm flex items-center px-4 justify-between no-print">
      {/* Left side: Sidebar Toggle Button + Festival Image (Program Committee, Program Leader, Judge) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {!hideSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {shouldShowFestival && (festivalFullNameImageUrl || festivalDisplayName) && (
          <div className="flex items-center min-w-0 h-full py-1">
            {!imageError && festivalFullNameImageUrl ? (
              <img
                src={festivalFullNameImageUrl}
                alt={festivalDisplayName || "Festival Full Name"}
                className="h-7 sm:h-8 md:h-9 max-h-9 w-auto max-w-[170px] sm:max-w-[240px] md:max-w-xs object-contain dark:brightness-0 dark:invert transition-all select-none"
                onError={() => setImageError(true)}
              />
            ) : festivalDisplayName ? (
              <span className="font-bold text-xs sm:text-sm md:text-base tracking-wider uppercase text-foreground/90 truncate select-none">
                {festivalDisplayName}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* User Profile / Actions */}
      <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
        <PushNotificationToggle iconOnly={true} className="shrink-0" />

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() =>
            mounted && setTheme(theme === "dark" ? "light" : "dark")
          }
          aria-label="Toggle theme"
          disabled={!mounted}
        >
          {renderThemeToggle()}
        </Button>

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="User menu" className="rounded-full overflow-hidden">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profilePic?.url} alt={user?.name || "User"} className="object-cover" />
                <AvatarFallback className="bg-transparent">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0 rounded-xl mr-4 mt-4 overflow-hidden"
            onPointerDownOutside={(e) => {
              if (
                e.target?.closest?.("[data-radix-select-viewport]") ||
                e.target?.closest?.("[role='listbox']") ||
                e.target?.closest?.("[data-radix-popper-content-wrapper]")
              ) {
                e.preventDefault();
              }
            }}
          >
            <Card className="border-none shadow-none">
              <CardHeader className="flex flex-row items-center justify-center gap-3 pb-6 border-b bg-muted/30 space-y-0 text-center">
                {institution?.logo?.url && (
                  <img
                    src={institution.logo.url}
                    alt="Institution Logo"
                    className="h-11 w-auto object-contain shrink-0"
                  />
                )}
                <div className="text-center">
                  <p className="text-sm font-black tracking-tight leading-tight text-foreground text-center">
                    {institution?.name === "Sa-adiya College of Integrated Studies" ? (
                      <>
                        Sa-adiya College of <br /> Integrated Studies
                      </>
                    ) : (
                      institution?.name || "Institution"
                    )}
                  </p>
                </div>
              </CardHeader>
              <CardHeader className="flex flex-col items-center justify-center text-center pt-6 pb-2 space-y-2">
                <Avatar className="h-16 w-16 border-2 border-primary/10">
                  <AvatarImage src={user?.profilePic?.url} alt={user?.name || "User"} className="object-cover" />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold text-lg">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center justify-center text-center overflow-hidden w-full">
                  <CardTitle className="text-base font-semibold truncate max-w-full text-center">
                    {user?.name || "User"}
                  </CardTitle>
                  <CardDescription className="text-xs truncate max-w-full text-center text-muted-foreground mt-0.5">
                    {user?.email || ""}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="flex-col gap-2">
                {filteredRoles.length > 0 && (
                  <div className="w-full">
                    <Select
                      value={effectiveRole || filteredRoles[0]}
                      onValueChange={handleRoleChange}
                    >
                      <SelectTrigger className="w-full pl-7 pr-3 [&>span]:flex-1 [&>span]:text-center">
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent className="z-[99999]">
                        {filteredRoles.map((r) => (
                          <SelectItem key={r} value={r} className="justify-center text-center">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {canEditProfile && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setIsEditModalOpen(true);
                    }}
                  >
                    Edit Profile
                  </Button>
                )}
                <Button
                  variant={canEditProfile ? "default" : "outline"}
                  className="w-full"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </CardFooter>
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {isTeacher && (
        <TeacherProfileEditModal
          user={user}
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
      {isStudent && (
        <ProfileEditModal
          user={user}
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </header>
  );
}
