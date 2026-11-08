import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import StudentCourses from "@/components/StudentCourses";
import connectToDB from "@/lib/db";
import Class from "@/models/Class.js";
import Batch from "@/models/Batch.js";
import Course from "@/models/Course.js";
import User from "@/models/User.js";
import { sortClasses } from "@/lib/utils";

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

    const classesData = await Class.find({ status: { $ne: "Closed" } })
      .select("_id name shortname status")
      .lean();
    classesData.sort((a, b) => {
      const classCompare = sortClasses(a, b);
      if (classCompare !== 0) return classCompare;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    const batchesData = await Batch.find({})
      .select("_id name startYear endYear")
      .sort({ startYear: -1, endYear: -1 })
      .lean();

    const coursesData = await Course.find({})
      .select("_id name type universityBoard description")
      .sort({ name: 1 })
      .lean();

    const studentsData = await User.find(
      {
        roles: "Student",
        $or: [
          { "studentSpecificField.islamicCourses.0": { $exists: true } },
          { "studentSpecificField.academicCourses.0": { $exists: true } },
        ],
      },
      "_id name studentSpecificField.islamicCourses studentSpecificField.academicCourses studentSpecificField.classId studentSpecificField.batchId studentSpecificField.status"
    ).lean();

    const classes = JSON.parse(JSON.stringify(classesData));
    const batches = JSON.parse(JSON.stringify(batchesData));
    const initialCourses = JSON.parse(JSON.stringify(coursesData));
    const initialStudents = JSON.parse(JSON.stringify(studentsData));
    const apiKey = process.env.API_KEY;

    return (
      <div className="px-1 md:px-4">
        <StudentCourses
          classes={classes}
          batches={batches}
          initialCourses={initialCourses}
          initialStudents={initialStudents}
          apiKey={apiKey}
        />
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
