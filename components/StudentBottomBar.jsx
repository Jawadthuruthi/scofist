"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Cookies from "js-cookie";
import { LayoutDashboard, GraduationCap, Users, IdCard, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentBottomBar({ user, activeRole: activeRoleProp }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const hasStudentRole = !user?.roles || user.roles.includes("Student");
  const isStudent =
    hasStudentRole &&
    (effectiveRole === "Student" || (!effectiveRole && user?.roles?.includes("Student")));

  const [currentStatus, setCurrentStatus] = useState(
    user?.studentSpecificField?.status || user?.status || user?.studentStatus || "Active"
  );

  useEffect(() => {
    if (user?.studentSpecificField?.status) {
      setCurrentStatus(user.studentSpecificField.status);
      return;
    }
    const uid = user?._id || user?.userId || user?.id;
    if (uid) {
      fetch(`/api/users?_id=${uid}`)
        .then((res) => res.json())
        .then((data) => {
          const fullUser =
            data?.users?.[0] || (Array.isArray(data) ? data[0] : (data?.user || data));
          const s =
            fullUser?.studentSpecificField?.status || fullUser?.status || fullUser?.studentStatus;
          if (s) setCurrentStatus(s);
        })
        .catch(() => {});
    }
  }, [user]);

  const isGraduated = currentStatus === "Graduated" || currentStatus === "Dropped Out";

  const navItems = isGraduated
    ? [
        {
          title: "Dashboard",
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          active: pathname === "/dashboard",
        },
        {
          title: "Faculty",
          label: "Faculty",
          href: "/dashboard/faculty",
          icon: Users,
          active: pathname?.startsWith("/dashboard/faculty"),
        },
        {
          title: "Spark",
          label: "Spark",
          href: "/dashboard/spark",
          icon: Briefcase,
          active: pathname?.startsWith("/dashboard/spark"),
        },
        {
          title: "Alumnies",
          label: "Alumnies",
          href: "/dashboard/alumnies",
          icon: GraduationCap,
          active: pathname?.startsWith("/dashboard/alumnies"),
        },
      ]
    : [
        {
          title: "Dashboard",
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          active: pathname === "/dashboard",
        },
        {
          title: "Students",
          label: "Students",
          href: "/dashboard/students",
          icon: GraduationCap,
          active: pathname?.startsWith("/dashboard/students"),
        },
        {
          title: "Faculty",
          label: "Faculty",
          href: "/dashboard/faculty",
          icon: Users,
          active: pathname?.startsWith("/dashboard/faculty"),
        },
        {
          title: "My ID",
          label: "My ID",
          href: "/dashboard/identity-cards",
          icon: IdCard,
          active: pathname?.startsWith("/dashboard/identity-cards"),
        },
      ];

  // Eagerly prefetch navigation targets
  useEffect(() => {
    if (!isStudent) return;
    navItems.forEach((item) => {
      try {
        router.prefetch(item.href);
      } catch (err) {}
    });
  }, [isStudent, router, navItems]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname, searchParams]);

  if (!isStudent) return null;

  const handleNavigation = (item) => {
    if (pathname === "/dashboard" && item.tab) {
      // Dispatches in-page tab change if already on student dashboard
      window.dispatchEvent(new CustomEvent("student-dashboard-tab-change", { detail: item.tab }));
    }
    if (item.href !== `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`) {
      setPendingHref(item.href);
      startTransition(() => {
        router.push(item.href);
      });
    }
  };

  const isNavigating = Boolean(pendingHref && pendingHref !== `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`);

  return (
    <nav
      aria-label="Student mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] lg:hidden print:hidden"
    >
      {isNavigating && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/20 overflow-hidden">
          <div className="h-full bg-primary animate-[animloader_0.8s_linear_infinite] w-1/3" />
        </div>
      )}

      <div className="flex items-center justify-around h-16 max-w-lg md:max-w-2xl mx-auto px-1 sm:px-4 md:px-6 pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isPendingItem = pendingHref === item.href;
          const isSelected = isNavigating ? isPendingItem : item.active;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                handleNavigation(item);
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
                {Icon && (
                  <Icon className={cn("w-5 h-5 transition-transform", isSelected && "scale-105")} />
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
