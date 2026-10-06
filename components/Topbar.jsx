"use client";

import { useState, useEffect } from "react";
import { Menu, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import TeacherProfileEditModal from "./TeacherProfileEditModal";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";

export function Topbar({ user, festival: initialFestival, activeRole: activeRoleProp, hideSidebarToggle = false }) {
  const { toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [institution, setInstitution] = useState(null);
  const [festival, setFestival] = useState(initialFestival || null);
  const [activeRole, setActiveRole] = useState(activeRoleProp || null);
  const [imageError, setImageError] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isTeacher = user?.roles?.includes("Teacher");

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
    activeRole ||
    (typeof window !== "undefined" ? Cookies.get("active-role") : null);

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
    <header className="fixed top-0 left-0 w-full z-10 h-14 min-h-14 shrink-0 bg-background border-b shadow-sm flex items-center px-4 justify-between no-print">
      {/* Sidebar Toggle Button */}
      {!hideSidebarToggle && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Center: Festival Full Name */}
      {shouldShowFestival && (festivalFullNameImageUrl || festivalDisplayName) && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none max-w-[calc(100%-160px)] sm:max-w-[calc(100%-180px)] md:max-w-xl h-full px-2">
          {!imageError && festivalFullNameImageUrl ? (
            <img
              src={festivalFullNameImageUrl}
              alt={festivalDisplayName || "Festival Full Name"}
              className="h-7 sm:h-8 md:h-9 max-h-9 w-auto max-w-full object-contain dark:brightness-0 dark:invert transition-all select-none"
              onError={() => setImageError(true)}
            />
          ) : festivalDisplayName ? (
            <span className="font-bold text-xs sm:text-sm md:text-base tracking-wider uppercase text-foreground/90 truncate select-none">
              {festivalDisplayName}
            </span>
          ) : null}
        </div>
      )}

      {/* User Profile / Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            mounted && setTheme(theme === "dark" ? "light" : "dark")
          }
          aria-label="Toggle theme"
          disabled={!mounted}
        >
          {renderThemeToggle()}
        </Button>

        <Popover>
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
          <PopoverContent className="w-72 p-0 rounded-xl mr-4 mt-4 overflow-hidden">
            <Card className="border-none shadow-none">
              <CardHeader className="flex flex-row items-center justify-center gap-3 pb-6 border-b bg-muted/30 space-y-0">
                {institution?.logo?.url && (
                  <img
                    src={institution.logo.url}
                    alt="Institution Logo"
                    className="h-12 w-auto object-contain shrink-0"
                  />
                )}
                <div className="text-left">
                  <p className="text-sm font-black tracking-tight leading-tight text-foreground">
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
              <CardHeader className="flex items-center space-x-4 pt-6">
                <Avatar className="h-12 w-12 border-2 border-primary/10">
                  <AvatarImage src={user.profilePic?.url} alt={user.name} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <CardTitle className="text-base truncate">
                    {user.name}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">
                    {user.email}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="flex-col gap-2">
                {isTeacher && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    Edit Profile
                  </Button>
                )}
                <Button
                  variant={isTeacher ? "default" : "outline"}
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
    </header>
  );
}
