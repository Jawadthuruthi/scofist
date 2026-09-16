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
  MessageSquare,
  FileSpreadsheet,
  FolderCheck,
  FileSearch,
  Calendar,
  ChevronsUpDown,
  X,
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
  TicketPercent,
  UserMinus,
  Download,
  QrCode,
  AlertCircle,
  FileQuestion,
  AlertTriangle,
  Newspaper,
  TrendingUp,
  ScanBarcode,
  Monitor,
  Camera,
  Layers2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
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
import YearSwitcher from "./YearSwitcher";
import PushNotificationToggle from "./PushNotificationToggle";

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
    title: "Screen",
    url: "/dashboard/screen",
    icon: Monitor,
    allowedRoles: ["Program Committee"],
  },
  {
    title: "Academic Calendar",
    url: "/dashboard/academic-calendar",
    icon: Calendar,
    allowedRoles: ["College Admin"],
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
    title: "My Attendance",
    url: "/dashboard/my-attendance",
    icon: UserCheck,
    allowedRoles: ["Teacher"],
  },
  {
    title: "Accounts",
    url: "/dashboard/accounts",
    icon: FileText,
    allowedRoles: ["College Admin", "Org Admin"],
  },
  {
    title: "Debtors",
    url: "/dashboard/debtors",
    icon: AlertTriangle,
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Applications",
    url: "/dashboard/applications",
    icon: FolderCheck,
    allowedRoles: ["College Admin"],
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
    allowedRoles: ["College Admin"],
  },
  {
    title: "Kinship",
    url: "/dashboard/students-families",
    icon: Users2,
    allowedRoles: ["College Admin"],
  },
  {
    title: "Students Fund",
    url: "/dashboard/students-fund",
    allowedRoles: ["Teacher"],
    icon: CreditCard,
  },
  {
    title: "Students",
    url: "/dashboard/students",
    icon: GraduationCap,
    allowedRoles: ["Student"],
  },
  {
    title: "Faculty",
    url: "/dashboard/faculty",
    icon: Users,
    allowedRoles: ["Student"],
  },
  {
    title: "Students Contacts",
    url: "/dashboard/students-contacts",
    icon: BookUser,
    allowedRoles: ["Teacher"],
  },
  {
    title: "General Attendance",
    url: "/dashboard/general-attendance",
    icon: ClipboardList,
    allowedRoles: ["Teacher"],
  },
  {
    title: "Marks",
    url: "/dashboard/marks",
    icon: FileSpreadsheet,
    allowedRoles: ["College Admin", "Teacher"],
  },
  {
    title: "Remarks",
    url: "/dashboard/remarks",
    icon: MessageSquare,
    allowedRoles: ["Teacher", "College Admin"],
  },
  {
    title: "Performance",
    url: "/dashboard/performance",
    icon: TrendingUp,
    allowedRoles: ["Teacher", "College Admin"],
  },
  {
    title: "Gate Pass",
    url: "/dashboard/gate-pass",
    icon: QrCode,
    allowedRoles: ["College Admin", "Gate Keeper", "Teacher"],
  },
  {
    title: "Hifz & Doura",
    url: "/dashboard/hifz-doura",
    icon: BookOpen,
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
    title: "Downloads",
    icon: Download,
    allowedRoles: ["College Admin", "Student", "Teacher"],
    subItems: [
      {
        title: "Question Papers",
        url: "/dashboard/downloads",
        icon: FileText,
        allowedRoles: ["College Admin", "Student", "Teacher"],
      },
      {
        title: "Syllabus",
        url: "/dashboard/syllabus",
        icon: BookOpen,
        allowedRoles: ["College Admin", "Student", "Teacher"],
      },
      {
        title: "Books",
        url: "/dashboard/downloads/books",
        icon: BookOpen,
        allowedRoles: ["College Admin", "Teacher"],
      },
      {
        title: "Identity Cards",
        url: "/dashboard/identity-cards",
        icon: IdCard,
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
        title: "Admission Register",
        url: "/dashboard/admission-register",
        icon: FileText,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Attendance History",
        url: "/dashboard/attendance-tracking",
        icon: UserCheck,
        allowedRoles: ["College Admin", "Teacher"],
      },
      {
        title: "Attendance Sheet",
        url: "/dashboard/attendance-sheet",
        icon: FileSpreadsheet,
        allowedRoles: ["College Admin", "Teacher"],
      },
      {
        title: "Attendance Table",
        url: "/dashboard/attendance-table",
        icon: FileSpreadsheet,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Students Reports",
        url: "/dashboard/students-reports",
        icon: FileSearch,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Students Certificate",
        url: "/dashboard/students-certificate",
        icon: FileText,
        allowedRoles: ["College Admin"],
      },
      {
        title: "Clearance Certificate",
        url: "/dashboard/clearance-certificate",
        icon: FileText,
        allowedRoles: ["College Admin"],
      },
    ],
  },
  {
    title: "Spark",
    url: "/dashboard/spark",
    icon: Briefcase,
    allowedRoles: ["Student"],
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Alumnies",
    url: "/dashboard/alumnies",
    icon: GraduationCap, // Reusing GraduationCap or could use another like Users
    allowedRoles: ["Student", "Spark Admin"],
  },
  {
    title: "Finance",
    url: "/dashboard/spark/finance",
    icon: CreditCard,
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Contacts",
    url: "/dashboard/spark/contacts",
    icon: BookUser,
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "Verification",
    url: "/dashboard/spark/verification",
    icon: CheckCircle,
    allowedRoles: ["Spark Admin"],
  },
  {
    title: "My Identity Card",
    url: "/dashboard/identity-cards",
    icon: IdCard,
    allowedRoles: ["Student"],
  },

  {
    title: "Dashboard",
    url: "/library-dashboard",
    icon: LayoutGrid,
    allowedRoles: ["Librarian"],
  },
  {
    title: "Books",
    url: "/dashboard/books",
    icon: BookOpen,
    allowedRoles: ["Librarian"],
  },
  {
    title: "Rentals",
    url: "/dashboard/rentals",
    icon: Users,
    allowedRoles: ["Librarian"],
  },
  {
    title: "Requests",
    url: "/dashboard/library-requests",
    icon: MessageSquare,
    allowedRoles: ["Librarian"],
  },
  {
    title: "Barcodes",
    url: "/dashboard/books/barcodes",
    icon: ScanBarcode,
    allowedRoles: ["Librarian"],
  },
  {
    title: "Finance",
    url: "/dashboard/finance",
    icon: CreditCard,
    allowedRoles: [],
  },
  {
    title: "Coupon Fund",
    url: "/dashboard/student-coupon-fund",
    icon: TicketPercent,
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Articles",
    url: "/dashboard/articles",
    icon: Newspaper,
    allowedRoles: ["Org Admin"],
  },
  {
    title: "Updates",
    url: "/dashboard/updates",
    icon: AlertCircle,
    allowedRoles: ["Org Admin"],
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
    title: "Attendance Sheet",
    url: "/dashboard/literary-attendance/attendance-sheet",
    allowedRoles: ["Literary Leader"],
    icon: FileSpreadsheet,
  },
  {
    title: "Attendance History",
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
    allowedRoles: ["Program Committee"],
    icon: LayoutGrid,
  },
  {
    title: "Teams",
    url: "/dashboard/teams",
    allowedRoles: ["Program Committee"],
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
    title: "Registrations",
    url: "/dashboard/program-registration",
    allowedRoles: ["Program Leader", "Program Committee"],
    icon: ClipboardList,
  },
  {
    title: "Scratch Cards",
    url: "/dashboard/scratch-cards",
    allowedRoles: ["Program Committee"],
    icon: TicketPercent,
  },
  {
    title: "Grade Scheme",
    url: "/dashboard/grade-scheme",
    allowedRoles: ["Program Committee"],
    icon: FileSpreadsheet,
  },
  {
    title: "Code Letters",
    url: "/dashboard/code-letters",
    allowedRoles: ["Program Committee"],
    icon: FileType,
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
    title: "Judges",
    url: "/dashboard/judges",
    allowedRoles: ["Program Committee"],
    icon: UserCheck,
  },
  {
    title: "Mark Entry Portal",
    url: "/judge-portal",
    allowedRoles: ["Judge"],
    icon: ListChecks,
  },
  {
    title: "Posters",
    url: "/dashboard/poster-customizer",
    allowedRoles: ["Program Committee"],
    icon: LayoutGrid,
  },
  {
    title: "Frames",
    url: "/dashboard/frame",
    allowedRoles: ["Program Committee"],
    icon: Layers2,
  },
  {
    title: "Gallery",
    url: "/dashboard/gallery",
    allowedRoles: ["Program Committee"],
    icon: Camera,
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
        title: "Check List",
        url: "/dashboard/check-list",
        allowedRoles: ["Program Committee"],
        icon: ListChecks,
      },
      {
        title: "Participants Card",
        url: "/dashboard/participants-card",
        icon: UserCheck,
        allowedRoles: ["Program Committee", "Program Leader"],
      },
      {
        title: "Unregistered Programs",
        url: "/dashboard/unregistered-programs",
        allowedRoles: ["Program Committee", "Program Leader"],
        icon: FileSearch,
      },
      {
        title: "Pending Code Letters",
        url: "/dashboard/pending-codeletters",
        allowedRoles: ["Program Committee"],
        icon: FileQuestion,
      },
      {
        title: "Evaluation Sheets",
        url: "/dashboard/evaluation-sheets",
        allowedRoles: ["Program Committee"],
        icon: FileSpreadsheet,
      },
      {
        title: "Pending Evaluation",
        url: "/dashboard/pending-evaluation",
        allowedRoles: ["Program Committee"],
        icon: ClipboardList,
      },
      {
        title: "Declared Results",
        url: "/dashboard/declared-results",
        icon: CheckCircle,
        allowedRoles: ["Program Committee"],
      },
      {
        title: "Undeclared Results",
        url: "/dashboard/undeclared-results",
        allowedRoles: ["Program Committee"],
        icon: AlertCircle,
      },
      {
        title: "Winners List",
        url: "/dashboard/winners-list",
        icon: Trophy,
        allowedRoles: ["Program Committee"],
      },
      {
        title: "Non Winners List",
        url: "/dashboard/non-winners",
        icon: UserMinus,
        allowedRoles: ["Program Committee"],
      },
      {
        title: "Non Responders List",
        url: "/dashboard/non-responders",
        icon: UserX,
        allowedRoles: ["Program Committee"],
      },
      {
        title: "Individual Results",
        url: "/dashboard/individual-results",
        icon: User,
        allowedRoles: ["Program Committee"],
      },
      {
        title: "Results QR Code",
        url: "/dashboard/results-qr-code",
        allowedRoles: ["Program Committee", "Program Leader"],
        icon: QrCode,
      },
    ],
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    allowedRoles: ["College Admin", "Program Committee", "Spark Admin", "Org Admin"],
  },
  {
    title: "Admin Users",
    url: "/dashboard/no-role-users",
    icon: UserX,
    allowedRoles: ["College Admin"],
  },
  {
    title: "Reset",
    url: "/dashboard/program-management/reset",
    icon: AlertTriangle,
    allowedRoles: ["Program Committee"],
  },
];

function ComboBox({ roles, role }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(role);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
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
      <PopoverContent
        className="w-[200px] p-0"
        style={{ zIndex: 9999, pointerEvents: "auto" }}
      >
        <Command>
          <CommandList>
            <CommandEmpty>No role found.</CommandEmpty>
            <CommandGroup>
              {roles.map((role) => (
                <CommandItem
                  key={role}
                  value={role}
                  className={cn(
                    "data-[selected='true']:bg-transparent data-[selected='true']:text-foreground",
                    value === role && "bg-accent text-accent-foreground !bg-accent !text-accent-foreground"
                  )}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    try {
                      Cookies.set("active-role", currentValue, {
                        url: "/",
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
                    } else {
                      window.location.href = "/dashboard";
                    }
                  }}
                >
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

export function AppSidebar({ roles, activeRole, user, settingsData, initialActiveYear }) {
  const filteredRoles = roles?.filter(r => r !== "Stationary" && r !== "IT Lab") || [];
  const sidebarRef = useRef(null);
  const { setOpen, setOpenMobile } = useSidebar();
  const [role, setRole] = useState(activeRole || filteredRoles[0] || "");
  const pathname = usePathname();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingTeacherRequestsCount, setPendingTeacherRequestsCount] = useState(0);
  const [pendingStudentRequestsCount, setPendingStudentRequestsCount] = useState(0);

  // Fetch pending profile requests for College Admin
  useEffect(() => {
    if (role !== "College Admin") return;
    const fetchCounts = async () => {
      try {
        const [teacherRes, studentRes] = await Promise.all([
          fetch("/api/users?roles=Teacher&profileUpdateStatus=Pending&limit=1&projection=_id"),
          fetch("/api/users?roles=Student&profileUpdateStatus=Pending&limit=1&projection=_id")
        ]);
        const teacherData = await teacherRes.json();
        const studentData = await studentRes.json();
        
        if (teacherData.pagination?.total !== undefined) {
          setPendingTeacherRequestsCount(teacherData.pagination.total);
        }
        if (studentData.pagination?.total !== undefined) {
          setPendingStudentRequestsCount(studentData.pagination.total);
        }
      } catch { /* silent */ }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [role]);

  // Fetch pending book requests count for Librarian
  useEffect(() => {
    if (role !== "Librarian") return;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/library/requests?status=Pending");
        const data = await res.json();
        if (data.success) setPendingRequestsCount(data.data?.length || 0);
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [role]);

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
    // Define standard platform roles to identify custom ones
    const STANDARD_ROLES = [
      "College Admin",
      "Org Admin",
      "Teacher",
      "Student",
      "Program Committee",
      "Program Leader",
      "Finance",
      "Literary Leader",

      "Spark Admin",
      "Librarian",
      "Gate Keeper",
      "Judge",
    ];

    return items
      .filter((item) => {
        // Special case: Allow 'Dashboard' for any authenticated role (including custom ones)
        // EXCEPT Gate Keeper who should only see Gate Pass
        if (item.title === "Dashboard") {
          if (role === "Gate Keeper") return false;
          if (
            item.allowedRoles?.includes(role) ||
            !STANDARD_ROLES.includes(role)
          )
            return true;
          return false;
        }

        if (!item.allowedRoles?.includes(role)) return false;

        // Custom check for Guest Teacher
        if (role === "Teacher" && user?.teacherSpecificField?.status === "Guest") {
          const allowedGuestItems = ["My Periods", "My Time Table", "Remarks", "My Attendance"];
          if (!allowedGuestItems.includes(item.title)) {
            return false;
          }
        }

        // Custom check for Downloads, Students, and Identity Cards: Visible only for 'Active' students
        if (
          (item.title === "Downloads" || item.title === "Students" || item.title === "My Identity Card") &&
          role === "Student" &&
          user?.studentSpecificField?.status !== "Active"
        ) {
          return false;
        }

        // Custom check for Spark and Alumnies: Visible only for 'Graduated' or 'Dropped Out' students
        if (
          (item.title === "Spark" || item.title === "Alumnies") &&
          role === "Student" &&
          user?.studentSpecificField?.status === "Active"
        ) {
          return false;
        }

        return true;
      })
      .map((item) => ({
        ...item,
        subItems: item.subItems
          ? item.subItems.filter((subItem) =>
              subItem.allowedRoles?.includes(role)
            )
          : undefined,
      }))
      .filter((item) => {
        const hasSubItems = item.subItems?.length > 0;
        const noSubItemsDefined = !item.subItems;
        const isVisible = hasSubItems || noSubItemsDefined;

        // Debuging Log
        // console.log(`Item: ${item.title}, Role: ${role}, HasSub: ${hasSubItems}, NoSubDefined: ${noSubItemsDefined}, Visible: ${isVisible}`);

        return isVisible;
      });
  }, [role, user]);

  return (
    <Sidebar ref={sidebarRef} className="no-print">
      <SidebarHeader className="p-0 gap-0 shrink-0">
        <div className="flex justify-between items-center h-14 min-h-14 px-4 sm:px-6 border-b shrink-0 bg-background">
          <h2 className="text-lg font-semibold">SCOFIST</h2>
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
      </SidebarHeader>
      <SidebarContent>
        <div className="mx-4 pt-2">
          <ComboBox roles={filteredRoles} role={role} />
        </div>
        {(role === "Program Committee" || role === "Program Leader" || role === "Judge") && (
          <YearSwitcher initialData={settingsData} activeRole={role} initialActiveYear={initialActiveYear} />
        )}
        <SidebarGroup className="px-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item, index) =>
                item.subItems ? (
                  <SidebarMenuItem key={item.url + item.title + index}>
                    <SidebarMenuButton asChild>
                      <div className="flex items-center gap-2">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuSub className="mr-0 pt-2">
                      {item.subItems.map((subItem, subIndex) => (
                        <SidebarMenuSubItem key={subItem.url + subItem.title + subIndex}>
                          <SidebarMenuSubButton
                            data-active={pathname === subItem.url}
                            asChild
                          >
                            <Link href={subItem.url} className="flex items-center gap-2">
                              <subItem.icon className="w-5 h-5" />
                              <span className="flex-1">{subItem.title}</span>
                              {subItem.title === "Teachers" && pendingTeacherRequestsCount > 0 && (
                                <span className="ml-auto text-xs font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none">
                                  {pendingTeacherRequestsCount}
                                </span>
                              )}
                              {subItem.title === "Students" && pendingStudentRequestsCount > 0 && (
                                <span className="ml-auto text-xs font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none">
                                  {pendingStudentRequestsCount}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem className="pt-1" key={item.url + item.title + index}>
                    <SidebarMenuButton
                      data-active={pathname === item.url}
                      asChild
                    >
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon className="w-5 h-5" />
                        <span className="flex-1">{item.title}</span>
                        {item.title === "Requests" && pendingRequestsCount > 0 && (
                          <span className="ml-auto text-xs font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none">
                            {pendingRequestsCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="p-4 mt-auto border-t">
        <PushNotificationToggle />
      </div>
    </Sidebar>
  );
}
