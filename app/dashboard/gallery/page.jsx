import { Suspense } from "react";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import ProgramCommitteeGallery from "@/components/ProgramCommitteeGallery";
import ErrorPage from "@/components/ErrorPage";
import { fetchData } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gallery Management | Program Committee",
  description: "Upload and manage festival photos and video links for the public gallery",
};

export default async function GalleryDashboardPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    let activeYear = cookiesStore.get("active-year")?.value;

    // Role check
    const allowedRoles = ["Program Committee", "College Admin", "Org Admin"];
    const hasAccess = allowedRoles.includes(activeRole);

    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-card border rounded-2xl max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-xs text-muted-foreground">
              This gallery management portal is accessible to the Program Committee and Administrators.
            </p>
          </div>
        </div>
      );
    }

    // Resolve active year if not present in cookie
    if (!activeYear) {
      try {
        const settingsData = await fetchData("settings", "", 60);
        activeYear =
          settingsData?.activeYear ||
          settingsData?.festival?.year ||
          settingsData?.years?.[settingsData.years.length - 1] ||
          "2026";
      } catch {
        activeYear = "2026";
      }
    }

    return (
      <div className="space-y-4">
        <Header
          title="FESTIVAL GALLERY"
          subTitle="Upload festival photos and link video highlights"
        />
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading gallery management...
            </div>
          }
        >
          <ProgramCommitteeGallery activeYear={activeYear} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("Error loading gallery dashboard page:", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading the gallery management page."
      />
    );
  }
}
