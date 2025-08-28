"use client";
import Link from "next/link";
import {
  User,
  Users,
  Book,
  ClipboardList,
  GraduationCap,
  Briefcase,
  FileText,
  UserCheck,
  UserX,
  Home,
  Settings,
  FileSpreadsheet,
  FolderCheck,
  FileSearch,
  Calendar,
  ChevronsUpDown,
  X,
  Check,
  CreditCard,
  BookOpen,
  Timer,
  BookUser,
  IdCard,
  LayoutGrid,
  UserSquare2,
  ListChecks,
  FileType,
  Trophy,
  Award,
  Users2,
  CheckCircle,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { usePathname } from "next/navigation";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    allowedRoles: [
      "College Admin",
      "Teacher",
      "Org Admin",
      "Student",
      "Program Committee",
      "Program Leader",
      "Finance",
      "Literary Leader",
    ],
  },
  {
    title: "My Periods",
    url: "/dashboard/my-periods",
    icon: Book,
    allowedRoles: ["Teacher"],
  },
  {
    title: "My Time Table",
    url: "/dashboard/my-time-table",
    icon: Calendar,
    allowedRoles: ["Teacher"],
  },
  {
    title: "Students",
    url: "/dashboard/students",
    icon: GraduationCap,
    allowedRoles: ["Teacher", "Student"],
  },
  {
    title: "Leave Register",
    url: "/dashboard/leave-register",
    icon: UserX,
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Students Contacts",
    url: "/dashboard/students-contacts",
    icon: BookUser,
    allowedRoles: ["Teacher", "College Admin"],
  },
  {
    title: "Students Fund",
    url: "/dashboard/students-fund",
    allowedRoles: ["College Admin", "Teacher"],
    icon: CreditCard,
  },
  {
    title: "Marks",
    url: "/dashboard/marks",
    icon: FileSpreadsheet,
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Applications",
    url: "/dashboard/applications",
    icon: FolderCheck,
    allowedRoles: ["College Admin"],
  },
  {
    title: "Managements",
    icon: Briefcase,
    allowedRoles: ["College Admin", "Teacher"],
    subItems: [
      {
        title: "Teachers",
        url: "/dashboard/teachers",
        icon: Users,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Batches",
        url: "/dashboard/batches",
        icon: ClipboardList,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Classes",
        url: "/dashboard/classes",
        icon: Book,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Students",
        url: "/dashboard/students",
        icon: GraduationCap,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Subjects",
        url: "/dashboard/subjects",
        icon: BookOpen,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Periods",
        url: "/dashboard/periods",
        icon: Timer,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Time Tables",
        url: "/dashboard/time-tables",
        icon: Calendar,
        allowedRoles: ["College Admin"],
      },
    ],
  },
  {
    title: "Reports",
    icon: FileText,
    allowedRoles: ["College Admin", "Teacher"],
    subItems: [
      {
        title: "Attendance Tracking",
        url: "/dashboard/attendance-tracking",
        icon: UserCheck,
        allowedRoles: ["College Admin", "Teacher"],
      },
      {
        title: "Leave History",
        url: "/dashboard/leave-history",
        icon: ClipboardList,
        allowedRoles: ["College Admin", "Teacher"],
      },
      {
        title: "Students Reports",
        url: "/dashboard/students-reports",
        icon: FileSearch,
        allowedRoles: ["College Admin", "Teacher"],
      },
      {
        title: "Students ID Card",
        url: "/dashboard/students-id-card",
        icon: IdCard,
        allowedRoles: ["College Admin"],
      },
    ],
  },
  {
    title: "Literary Groups",
    url: "/dashboard/literary-groups",
    allowedRoles: ["Literary Leader"],
    icon: Users,
  },
  {
    title: "Attendance",
    url: "/dashboard/literary-attendance",
    allowedRoles: ["Literary Leader"],
    icon: ClipboardList,
  },
  {
    title: "Attendance Tracking",
    url: "/dashboard/literary-attendance/attendance-tracking",
    allowedRoles: ["Literary Leader"],
    icon: UserCheck,
  },
  {
    title: "Instructions",
    url: "/dashboard/instructions",
    allowedRoles: ["Program Committee", "Program Leader"],
    icon: FileText,
  },
  {
    title: "Divisions",
    url: "/dashboard/divisions",
    allowedRoles: ["Program Leader", "Program Committee"],
    icon: LayoutGrid,
  },
  {
    title: "Teams",
    url: "/dashboard/teams",
    allowedRoles: ["Program Leader", "Program Committee"],
    icon: UserSquare2,
  },
  {
    title: "Participants",
    url: "/dashboard/participants",
    allowedRoles: ["Program Leader", "Program Committee"],
    icon: Users,
  },
  {
    title: "Programs",
    url: "/dashboard/programs",
    allowedRoles: ["Program Leader", "Program Committee"],
    icon: ListChecks,
  },
  {
    title: "Schedules",
    url: "/dashboard/schedules",
    allowedRoles: ["Program Leader", "Program Committee"],
    icon: Calendar,
  },
  {
    title: "Rules & Topics",
    url: "/dashboard/rules-topics",
    allowedRoles: ["Program Committee", "Program Leader"],
    icon: BookOpen,
  },
  {
    title: "Program Registration",
    url: "/dashboard/program-registration",
    allowedRoles: ["Program Leader", "Program Committee"],
    icon: ClipboardList,
  },
  {
    title: "Code Letters",
    url: "/dashboard/code-letters",
    allowedRoles: ["Program Committee"],
    icon: FileType,
  },
  {
    title: "Grade Scheme",
    url: "/dashboard/grade-scheme",
    allowedRoles: ["Program Committee"],
    icon: FileSpreadsheet,
  },
  {
    title: "Evaluation",
    url: "/dashboard/evaluation",
    allowedRoles: ["Program Committee"],
    icon: ListChecks,
  },
  {
    title: "Results",
    url: "/dashboard/results",
    allowedRoles: ["Program Committee"],
    icon: Trophy,
  },
  {
    title: "Points",
    icon: Award,
    allowedRoles: ["Program Committee"],
    subItems: [
      {
        title: "Team Points",
        url: "/dashboard/team-points",
        icon: Users2,
        allowedRoles: ["Program Committee"],
      },
      {
        title: "Individual Points",
        url: "/dashboard/individual-points",
        icon: User,
        allowedRoles: ["Program Committee"],
      },
    ],
  },
  {
    title: "Reports",
    icon: FileText,
    allowedRoles: ["Program Committee", "Program Leader"],
    subItems: [
      {
        title: "Unregistered Programs",
        url: "/dashboard/unregistered-programs",
        allowedRoles: ["Program Committee", "Program Leader"],
        icon: FileSearch,
      },
      {
        title: "Evaluation Sheets",
        url: "/dashboard/evaluation-sheets",
        allowedRoles: ["Program Committee"],
        icon: FileSpreadsheet,
      },
      {
        title: "Participants Card",
        url: "/dashboard/participants-card",
        icon: UserCheck,
        allowedRoles: ["Program Committee"],
      },
      {
        title: "Declared Results",
        url: "/dashboard/declared-results",
        icon: CheckCircle,
        allowedRoles: ["Program Committee"],
      },
    ],
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    allowedRoles: ["College Admin", "Program Committee"],
  },
];

function ComboBox({ roles, role }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(role);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          // Add touch-friendly styles for iOS
          style={{
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            touchAction: "manipulation",
          }}
        >
          {value ? roles.find((role) => role === value) : "Select role..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-60 max-w-[90vw] p-0 pointer-events-auto"
        // Remove absolute positioning and high z-index that can cause issues
        // Let the Popover component handle positioning naturally
        sideOffset={4}
        style={{
          // Ensure the popover is touchable on iOS
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          touchAction: "manipulation",
          // Force hardware acceleration to improve touch responsiveness
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        <Command>
          <CommandList>
            <CommandEmpty>No role found.</CommandEmpty>
            <CommandGroup>
              {roles.map((role) => (
                <CommandItem
                  key={role}
                  value={role}
                  // Add explicit touch handling for iOS
                  style={{
                    WebkitTouchCallout: "none",
                    WebkitUserSelect: "none",
                    touchAction: "manipulation",
                    cursor: "pointer",
                  }}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    try {
                      Cookies.set("active-role", currentValue, {
                        path: "/",
                      });
                      console.log("Cookie set successfully");
                    } catch (error) {
                      console.error("Error setting cookie:", error);
                    }
                    window.location.reload();
                    window.location.href = "/dashboard";
                  }}
                  // Add touch event handlers as backup for iOS
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    // Trigger the same logic as onSelect
                    const currentValue = role;
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    try {
                      Cookies.set("active-role", currentValue, {
                        path: "/",
                        expires: 1,
                      });
                      console.log("Cookie set successfully");
                    } catch (error) {
                      console.error("Error setting cookie:", error);
                    }
                    window.location.reload();
                    window.location.href = "/dashboard";
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === role ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {role}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AppSidebar({ roles, activeRole }) {
  const sidebarRef = useRef(null);
  const { setOpen, setOpenMobile } = useSidebar();
  const [role, setRole] = useState(activeRole || roles[0] || "");
  const pathname = usePathname();

  // Close sidebar on outside click
  const handleClickOutside = useCallback(
    (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setOpen(false);
        setOpenMobile(false);
      }
    },
    [setOpen]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    setOpen(false);
    setOpenMobile(false);
  }, [pathname]);

  // Memoized filtered menu items
  const menuItems = useMemo(() => {
    return items
      .filter((item) => item.allowedRoles?.includes(role))
      .map((item) => ({
        ...item,
        subItems: item.subItems
          ? item.subItems.filter((subItem) =>
              subItem.allowedRoles?.includes(role)
            )
          : undefined,
      }))
      .filter((item) => item.subItems?.length > 0 || !item.subItems);
  }, [role]);

  return (
    <Sidebar ref={sidebarRef}>
      <SidebarContent>
        <div className="flex justify-between items-center h-14 px-6 border-b">
          <h2 className="text-lg  font-semibold">SCOFIST</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setOpen(false);
              setOpenMobile(false);
            }}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="mx-4">
          <ComboBox roles={roles} role={role} />
        </div>
        <SidebarGroup className="px-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.subItems ? (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <div className="flex items-center gap-2">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuSub className="mr-0 pt-2">
                      {item.subItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            data-active={pathname === subItem.url}
                            asChild
                          >
                            <Link href={subItem.url}>
                              <subItem.icon className="w-5 h-5" />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem className="pt-1" key={item.title}>
                    <SidebarMenuButton
                      data-active={pathname === item.url}
                      asChild
                    >
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
