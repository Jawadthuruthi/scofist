import FrameEditor from "@/components/FrameEditor";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { cookies, headers } from "next/headers";
import { parseUser } from "@/lib/utils";

export const metadata = {
  title: "Frames — Sadiya Dawa College",
  description: "Upload photo frames, apply them to photos and download the result.",
};

export const dynamic = "force-dynamic";

export default async function FramePage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;

    if (!["Program Committee"].includes(activeRole)) {
      throw new Error(
        "Unauthorized access — Only Program Committee can manage frames"
      );
    }

    return (
      <>
        <Header
          title="FRAMES"
          subTitle="Upload photo frames, apply them to photos and download the result"
        />
        <div className="pt-0">
          <FrameEditor />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading frame page:", error?.message);
    return (
      <ErrorPage
        statusCode={403}
        title="Access Error"
        description={
          error?.message ||
          "An unexpected error occurred while processing your request."
        }
      />
    );
  }
}
