import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";
import JudgeBottomBar from "@/components/JudgeBottomBar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getCachedSettings } from "@/lib/settings";
import { resolveLayoutUserAndRole } from "@/lib/userProfile";
import { cookies, headers } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({ children }) {
  const headerStore = await headers();
  const cookiesStore = await cookies();
  const { user, activeRole, needsProfileCacheSync } =
    await resolveLayoutUserAndRole(headerStore, cookiesStore);

  let settingsData = null;
  let initialActiveYear = "";
  try {
    settingsData = await getCachedSettings();
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

  const activeFestival =
    settingsData?.festivals?.find((f) => f.year === initialActiveYear) ||
    settingsData?.festival;

  const festivalWithFullName =
    (activeFestival?.festivalFullNameImage?.url ? activeFestival : null) ||
    settingsData?.festivals?.find((f) => f.festivalFullNameImage?.url) ||
    activeFestival;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-screen overflow-hidden min-w-full max-w-full">
          <AppSidebar roles={user?.roles} activeRole={activeRole} user={user} settingsData={settingsData} initialActiveYear={initialActiveYear} />
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar user={user} festival={festivalWithFullName} activeRole={activeRole} settingsData={settingsData} needsProfileCacheSync={needsProfileCacheSync} />
            <main className="flex-1 p-4 mt-14 overflow-auto container">
              {children}
              <div className="h-20 md:h-0 no-print"></div>
            </main>
            <JudgeBottomBar user={user} activeRole={activeRole} />
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
