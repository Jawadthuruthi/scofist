import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";
import TeacherBottomBar from "@/components/TeacherBottomBar";
import LibrarianBottomBar from "@/components/LibrarianBottomBar";
import CollegeAdminBottomBar from "@/components/CollegeAdminBottomBar";
import OrgAdminBottomBar from "@/components/OrgAdminBottomBar";
import LiteraryLeaderBottomBar from "@/components/LiteraryLeaderBottomBar";
import ProgramCommitteeBottomBar from "@/components/ProgramCommitteeBottomBar";
import ProgramLeaderBottomBar from "@/components/ProgramLeaderBottomBar";
import SparkAdminBottomBar from "@/components/SparkAdminBottomBar";
import JudgeBottomBar from "@/components/JudgeBottomBar";
import StudentBottomBar from "@/components/StudentBottomBar";
import { cookies, headers } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getCachedSettings } from "@/lib/settings";
import { resolveLayoutUserAndRole } from "@/lib/userProfile";

export const dynamic = 'force-dynamic';

export default async function Layout({ children }) {
  const headerStore = await headers();
  const cookiesStore = await cookies();
  const { user, activeRole: currentActiveRole, needsProfileCacheSync } =
    await resolveLayoutUserAndRole(headerStore, cookiesStore);

  const isFestivalRole =
    currentActiveRole === "Program Committee" ||
    currentActiveRole === "Program Leader" ||
    currentActiveRole === "Judge";

  // Directly load settings using cached DB loader to eliminate internal HTTP self-fetch loops
  let settingsData = await getCachedSettings();
  let initialActiveYear = "";

  if (isFestivalRole && settingsData) {
    const fetchedYears = settingsData.years || ["2025 november"];
    const fetchedBlockedYears = settingsData.blockedYears || [];
    const recentYear = fetchedYears.length > 0 ? fetchedYears[fetchedYears.length - 1] : "2025 november";
    let currentYear = cookiesStore.get("active-year")?.value;

    if (currentActiveRole === "Program Committee" || currentActiveRole === "Program Leader") {
      if (!currentYear) currentYear = recentYear;
    } else {
      if (!currentYear) currentYear = settingsData.activeYear || recentYear;
    }

    if (fetchedYears.length > 0 && !fetchedYears.includes(currentYear)) {
      currentYear = recentYear;
    }

    if (fetchedBlockedYears.includes(currentYear)) {
      const unblockedYears = fetchedYears.filter((y) => !fetchedBlockedYears.includes(y));
      currentYear = unblockedYears.length > 0 ? unblockedYears[unblockedYears.length - 1] : currentYear;
    }

    initialActiveYear = currentYear || "";
  }

  const activeFestival = isFestivalRole
    ? (initialActiveYear && settingsData?.festivals?.find((f) => f.year === initialActiveYear)) ||
    (settingsData?.festival?.year === initialActiveYear ? settingsData?.festival : null) ||
    (initialActiveYear ? { year: initialActiveYear } : settingsData?.festival)
    : null;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-screen print:h-auto overflow-hidden print:overflow-visible min-w-full max-w-full">
          <AppSidebar roles={user?.roles} activeRole={currentActiveRole} user={user} settingsData={settingsData} initialActiveYear={initialActiveYear} />
          <div className="flex flex-col flex-1 min-w-0 print:block">
            <Topbar user={user} festival={activeFestival} activeRole={currentActiveRole} settingsData={settingsData} needsProfileCacheSync={needsProfileCacheSync} />
            <main className="flex-1 px-4 lg:p-6 mt-14 print:mt-0 overflow-auto print:overflow-visible container print:block print:p-0">
              {children}
              <div className="h-20 lg:h-16 no-print"></div>
            </main>
            {currentActiveRole === "Teacher" ? <TeacherBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "Librarian" ? <LibrarianBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "College Admin" ? <CollegeAdminBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "Org Admin" ? <OrgAdminBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "Literary Leader" ? <LiteraryLeaderBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "Program Committee" ? <ProgramCommitteeBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "Program Leader" ? <ProgramLeaderBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "Spark Admin" ? <SparkAdminBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "Judge" ? <JudgeBottomBar user={user} activeRole={currentActiveRole} /> : null}
            {currentActiveRole === "Student" ? <StudentBottomBar user={user} activeRole={currentActiveRole} /> : null}
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
