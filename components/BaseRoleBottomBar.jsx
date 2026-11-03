"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Cookies from "js-cookie";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BaseRoleBottomBar({
  user,
  activeRole: activeRoleProp,
  targetRole,
  navItems = [],
  ariaLabel,
  className,
}) {
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

  // Listen for role changes across tabs or custom dispatch
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

  // Check if current user is allowed this role and if it's currently active
  const hasRole = !user?.roles || user.roles.includes(targetRole);
  const isTargetActive =
    hasRole &&
    (effectiveRole === targetRole || (!effectiveRole && user?.roles?.[0] === targetRole));

  // Eagerly prefetch navigation targets
  useEffect(() => {
    if (!isTargetActive) return;
    navItems.forEach((item) => {
      if (item.href) {
        try {
          router.prefetch(item.href);
        } catch (err) {
          // Safe swallow
        }
      }
    });
  }, [isTargetActive, navItems, router]);

  // Clear pending state when navigation completes
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  if (!isTargetActive) return null;

  const isNavigating = Boolean(pendingHref && pendingHref !== pathname);

  return (
    <nav
      aria-label={ariaLabel || `${targetRole} mobile and tablet navigation`}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]",
        className || "lg:hidden print:hidden"
      )}
    >
      {/* Subtle animated loading progress bar across top edge when navigation is in flight */}
      {isNavigating && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/20 overflow-hidden">
          <div className="h-full bg-primary animate-[animloader_0.8s_linear_infinite] w-1/3" />
        </div>
      )}

      <div className="flex items-center justify-around h-16 max-w-lg md:max-w-2xl mx-auto px-1 sm:px-4 md:px-6 pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isPendingItem = item.href && pendingHref === item.href;
          const isSelected = isNavigating ? isPendingItem : item.active;

          const innerContent = (
            <>
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
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                    {item.badge}
                  </span>
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
            </>
          );

          const className = cn(
            "group relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all select-none active:scale-95 cursor-pointer",
            isSelected
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          );

          if (item.href) {
            return (
              <Link
                key={item.href || idx}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  if (item.onClick) {
                    item.onClick(e);
                  }
                  if (item.href && item.href !== pathname) {
                    setPendingHref(item.href);
                    startTransition(() => {
                      router.push(item.href);
                    });
                  }
                }}
                onPointerDown={() => {
                  if (item.href) {
                    try {
                      router.prefetch(item.href);
                    } catch (err) {}
                  }
                }}
                title={item.title || item.label}
                aria-label={item.title || item.label}
                className={className}
              >
                {innerContent}
              </Link>
            );
          }

          return (
            <button
              key={item.id || item.label || idx}
              type="button"
              onClick={item.onClick}
              title={item.title || item.label}
              aria-label={item.title || item.label}
              className={className}
            >
              {innerContent}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

