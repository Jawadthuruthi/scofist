import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";
import TeacherBottomBar from "@/components/TeacherBottomBar";
import LibrarianBottomBar from "@/components/LibrarianBottomBar";
import { cookies, headers } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { parseUser, fetchData } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function Layout({ children }) {
  const headerStore = await headers();
  const cookiesStore = await cookies();
  const user = parseUser(headerStore);
  const activeRole = cookiesStore.get("active-role")?.value;

  // Pre-fetch settings on the server so the Festival Session switcher
  // renders immediately without a client-side loading skeleton.
  let settingsData = null;
  let initialActiveYear = "";
  try {
    settingsData = await fetchData("settings", "", 60);
    if (settingsData && (activeRole === "Program Committee" || activeRole === "Program Leader" || activeRole === "Judge")) {
      const fetchedYears = settingsData.years || ["2025 november"];
      const fetchedBlockedYears = settingsData.blockedYears || [];
      const recentYear = fetchedYears.length > 0 ? fetchedYears[fetchedYears.length - 1] : "2025 november";
      let currentYear = cookiesStore.get("active-year")?.value;

      if (activeRole === "Program Committee" || activeRole === "Program Leader") {
        if (!currentYear) currentYear = recentYear;
      } else {
        if (!currentYear) currentYear = settingsData.activeYear || recentYear;
      }

      if (fetchedYears.length > 0 && !fetchedYears.includes(currentYear)) {
        currentYear = recentYear;
      }

      if ((activeRole === "Program Leader" || activeRole === "Program Committee") && fetchedBlockedYears.includes(currentYear)) {
        const unblockedYears = fetchedYears.filter(y => !fetchedBlockedYears.includes(y));
        currentYear = unblockedYears.length > 0 ? unblockedYears[unblockedYears.length - 1] : currentYear;
      }

      initialActiveYear = currentYear || "";
    }
  } catch {
    // Non-critical — YearSwitcher will fetch it client-side as fallback
  }

  const isFestivalRole =
    activeRole === "Program Committee" ||
    activeRole === "Program Leader" ||
    activeRole === "Judge";

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
          <AppSidebar roles={user?.roles} activeRole={activeRole} user={user} settingsData={settingsData} initialActiveYear={initialActiveYear} />
          <div className="flex flex-col flex-1 min-w-0 print:block">
            <Topbar user={user} festival={activeFestival} activeRole={activeRole} />
            <main className="flex-1 px-4 lg:p-6 mt-14 print:mt-0 overflow-auto print:overflow-visible container print:block print:p-0">
              {children}
              <div className="h-20 lg:h-16 no-print"></div>
            </main>
            <TeacherBottomBar user={user} activeRole={activeRole} />
            <LibrarianBottomBar user={user} activeRole={activeRole} />
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
