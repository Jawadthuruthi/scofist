"use client";
import Link from "next/link";
import {
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
    allowedRoles: ["College Admin", "Teacher", "Org Admin", "Student"],
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
      {
        title: "Marks",
        url: "/dashboard/marks",
        icon: FileSpreadsheet,
        allowedRoles: ["College Admin", "Teacher"],
      },
      {
        title: "Leave Records",
        url: "/dashboard/leave-records",
        icon: UserX,
        allowedRoles: ["College Admin", "Teacher"],
      },
      {
        title: "Applications",
        url: "/dashboard/applications",
        icon: FolderCheck,
      },
    ],
  },
  {
    title: "Students Transactions",
    url: "/dashboard/students-transactions",
    icon: CreditCard,
    allowedRoles: ["Teacher"],
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
        title: "Students Reports",
        url: "/dashboard/students-reports",
        icon: FileSearch,
        allowedRoles: ["College Admin", "Teacher"],
      },
    ],
  },

  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    allowedRoles: ["College Admin"],
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
        >
          {value ? roles.find((role) => role === value) : "Select role..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No role found.</CommandEmpty>
            <CommandGroup>
              {roles.map((role) => (
                <CommandItem
                  key={role}
                  value={role}
                  onSelect={(currentValue) => {
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
