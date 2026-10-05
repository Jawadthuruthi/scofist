import { Suspense } from "react";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import CollegeAdminGallery from "@/components/CollegeAdminGallery";
import ErrorPage from "@/components/ErrorPage";
import { fetchData } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "College Gallery | Admin",
  description: "Upload and manage college photos and video links for the public gallery",
};

export default async function CollegeGalleryPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    let activeYear = cookiesStore.get("active-year")?.value;

    if (activeRole !== "College Admin") {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-card border rounded-2xl max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-xs text-muted-foreground">
              This gallery management portal is accessible to College Admin only.
            </p>
          </div>
        </div>
      );
    }

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
          title="COLLEGE GALLERY"
          subTitle="Upload college photos and video links for the public gallery"
        />
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading gallery management...
            </div>
          }
        >
          <CollegeAdminGallery activeYear={activeYear} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("Error loading college gallery page:", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading the college gallery management page."
      />
    );
  }
}
