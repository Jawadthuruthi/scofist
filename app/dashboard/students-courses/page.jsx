import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import StudentCourses from "@/components/StudentCourses";
import connectToDB from "@/lib/db";
import Class from "@/models/Class.js";
import Batch from "@/models/Batch.js";

export default async function StudentCoursesPage() {
  try {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;

    const allowedRoles = ["College Admin"];
    if (!allowedRoles.includes(activeRole))
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="Only College Admins can access Student Courses."
        />
      );

    try {
      await connectToDB();
    } catch (error) {
      console.error("Error connecting to database:", error.message);
      throw error;
    }

    const classesData = await Class.find({})
      .select("_id name shortname status")
      .lean();
    classesData.sort((a, b) =>
      a._id.localeCompare(b._id, undefined, { numeric: true, sensitivity: "base" })
    );

    const batchesData = await Batch.find({})
      .select("_id name startYear endYear")
      .sort({ startYear: -1, endYear: -1 })
      .lean();

    const classes = JSON.parse(JSON.stringify(classesData));
    const batches = JSON.parse(JSON.stringify(batchesData));
    const apiKey = process.env.API_KEY;

    return (
      <div className="px-1 md:px-4">
        <StudentCourses classes={classes} batches={batches} apiKey={apiKey} />
      </div>
    );
  } catch (error) {
    console.error("Error loading student courses:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading student courses."
      />
    );
  }
}

export const revalidate = 0;
