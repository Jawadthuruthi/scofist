"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Cookies from "js-cookie";
import { LayoutDashboard, BookOpen, CalendarX, CreditCard, ClipboardList, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TeacherBottomBar({ user, activeRole: activeRoleProp }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState(null);

  const [activeRole, setActiveRole] = useState(
    activeRoleProp || (typeof window !== "undefined" ? Cookies.get("active-role") : null)
  );

  useEffect(() => {
    if (activeRoleProp) {
      setActiveRole(activeRoleProp);
    } else if (typeof window !== "undefined") {
      const cookieRole = Cookies.get("active-role");
      if (cookieRole) setActiveRole(cookieRole);
    }
  }, [activeRoleProp]);

  // Listen for role changes or custom events if fired
  useEffect(() => {
    const handleRoleChanged = (e) => {
      const newRole = e?.detail || (typeof window !== "undefined" ? Cookies.get("active-role") : null);
      if (newRole) setActiveRole(newRole);
    };

    window.addEventListener("active-role-changed", handleRoleChanged);
    return () => window.removeEventListener("active-role-changed", handleRoleChanged);
  }, []);

  const effectiveRole =
    activeRole || (typeof window !== "undefined" ? Cookies.get("active-role") : null);

  const hasTeacherRole = !user?.roles || user.roles.includes("Teacher");
  const isTeacher =
    hasTeacherRole &&
    (effectiveRole === "Teacher" || (!effectiveRole && user?.roles?.includes("Teacher")));

  const navItems = [
    {
      title: "Dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      title: "My Periods",
      label: "My Periods",
      href: "/dashboard/my-periods",
      icon: BookOpen,
      active: pathname?.startsWith("/dashboard/my-periods"),
    },
    {
      title: "Leave Register",
      label: "Leaves",
      href: "/dashboard/leave-register",
      icon: CalendarX,
      active: pathname?.startsWith("/dashboard/leave-register"),
    },
    {
      title: "Students Fund",
      label: "Fund",
      href: "/dashboard/students-fund",
      icon: CreditCard,
      active: pathname?.startsWith("/dashboard/students-fund"),
    },
    {
      title: "General Attendance",
      label: "General",
      href: "/dashboard/general-attendance",
      icon: ClipboardList,
      active: pathname?.startsWith("/dashboard/general-attendance"),
    },
  ];

  // Eagerly prefetch all teacher navigation targets as soon as mounted
  useEffect(() => {
    if (!isTeacher) return;
    navItems.forEach((item) => {
      try {
        router.prefetch(item.href);
      } catch (err) {
        // Safe swallow
      }
    });
  }, [isTeacher, router]);

  // Clear pending state when navigation completes
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Strictly for teachers only
  if (!isTeacher) return null;

  const handleNavigation = (href) => {
    if (href !== pathname) {
      setPendingHref(href);
      startTransition(() => {
        router.push(href);
      });
    }
  };

  const isNavigating = Boolean(pendingHref && pendingHref !== pathname);

  return (
    <nav
      aria-label="Teacher mobile and tablet navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] lg:hidden print:hidden"
    >
      {/* Subtle animated loading progress bar across top edge when navigation is in flight */}
      {isNavigating && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/20 overflow-hidden">
          <div className="h-full bg-primary animate-[animloader_0.8s_linear_infinite] w-1/3" />
        </div>
      )}

      <div className="flex items-center justify-around h-16 max-w-lg md:max-w-2xl mx-auto px-1 sm:px-4 md:px-6 pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Optimistically show as selected if this item was just tapped
          const isPendingItem = pendingHref === item.href;
          const isSelected = isNavigating ? isPendingItem : item.active;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={(e) => {
                // If it's already active and not pending, let default link handle it
                if (item.active && !pendingHref) return;
                setPendingHref(item.href);
              }}
              onTouchStart={() => {
                try {
                  router.prefetch(item.href);
                } catch (err) {}
              }}
              onMouseEnter={() => {
                try {
                  router.prefetch(item.href);
                } catch (err) {}
              }}
              title={item.title}
              aria-label={item.title}
              className={cn(
                "group relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all select-none active:scale-95",
                isSelected
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isSelected && (
                <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full transition-all duration-300" />
              )}
              <div
                className={cn(
                  "relative flex items-center justify-center p-1.5 rounded-full transition-all duration-200",
                  isSelected
                    ? "bg-primary/10 text-primary scale-105"
                    : "group-hover:bg-muted/60"
                )}
              >
                {isPendingItem && !item.active ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <Icon className="w-5 h-5 transition-transform" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] leading-tight tracking-tight mt-0.5 transition-all duration-200 text-center truncate max-w-[64px] sm:max-w-[80px]",
                  isSelected ? "font-semibold text-primary" : "font-normal"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
