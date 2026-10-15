import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Course from "@/models/Course";
import User from "@/models/User";
import Class from "@/models/Class";
import Batch from "@/models/Batch";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectToDB();

    // 1. Fetch all master courses
    const masterCourses = await Course.find({}).sort({ name: 1 }).lean();

    // 2. Fetch all students with their courses
    const students = await User.find(
      { roles: "Student" },
      "_id name studentSpecificField.islamicCourses studentSpecificField.academicCourses studentSpecificField.classId studentSpecificField.batchId"
    ).lean();

    // Fetch classes and batches for friendly names
    const classes = await Class.find({}, "_id name shortname").lean();
    const batches = await Batch.find({}, "_id name").lean();

    const classMap = new Map(classes.map((c) => [String(c._id), c.name || c.shortname]));
    const batchMap = new Map(batches.map((b) => [String(b._id), b.name]));

    // 3. Aggregate courses by normalized course name
    // courseMap key: `${type.toLowerCase()}:${name.toLowerCase()}`
    const courseMap = new Map();

    // Helper to register course in map
    const registerCourseEntry = (name, type, defaultBoard = "") => {
      const key = `${type.toLowerCase()}:${name.trim().toLowerCase()}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          name: name.trim(),
          type, // "Islamic" | "Academic"
          universityBoard: defaultBoard || "",
          studentCount: 0,
          completedCount: 0,
          ongoingCount: 0,
          pendingCount: 0,
          students: [],
        });
      }
      return courseMap.get(key);
    };

    // Pre-populate with master courses
    masterCourses.forEach((mc) => {
      if (mc.type === "Both") {
        registerCourseEntry(mc.name, "Islamic", mc.universityBoard);
        registerCourseEntry(mc.name, "Academic", mc.universityBoard);
      } else {
        registerCourseEntry(mc.name, mc.type, mc.universityBoard);
      }
    });

    // Populate from student records
    const coursesToSeed = [];

    students.forEach((student) => {
      const studentId = student._id?.toString();
      const studentName = student.name || "Unknown";
      const classIdStr = student.studentSpecificField?.classId?.toString();
      const batchIdStr = student.studentSpecificField?.batchId?.toString();
      const className = classMap.get(classIdStr) || "—";
      const batchName = batchMap.get(batchIdStr) || "—";

      // Islamic courses
      const islamicList = student.studentSpecificField?.islamicCourses || [];
      islamicList.forEach((c, idx) => {
        if (!c.courseName?.trim()) return;
        const entry = registerCourseEntry(c.courseName, "Islamic", c.universityBoard);
        if (!entry.universityBoard && c.universityBoard) {
          entry.universityBoard = c.universityBoard;
        }

        entry.studentCount += 1;
        if (c.status === "Completed") entry.completedCount += 1;
        else if (c.status === "Ongoing") entry.ongoingCount += 1;
        else if (c.status === "Pending") entry.pendingCount += 1;

        entry.students.push({
          studentId,
          studentName,
          classId: classIdStr || "",
          batchId: batchIdStr || "",
          className,
          batchName,
          year: c.year ? String(c.year).trim() : "1",
          status: c.status || "Ongoing",
          universityBoard: c.universityBoard || entry.universityBoard || "—",
          index: idx,
          type: "Islamic",
        });

        // Seed check
        coursesToSeed.push({ name: c.courseName.trim(), type: "Islamic", universityBoard: c.universityBoard || "" });
      });

      // Academic courses
      const academicList = student.studentSpecificField?.academicCourses || [];
      academicList.forEach((c, idx) => {
        if (!c.courseName?.trim()) return;
        const entry = registerCourseEntry(c.courseName, "Academic", c.universityBoard);
        if (!entry.universityBoard && c.universityBoard) {
          entry.universityBoard = c.universityBoard;
        }

        entry.studentCount += 1;
        if (c.status === "Completed") entry.completedCount += 1;
        else if (c.status === "Ongoing") entry.ongoingCount += 1;
        else if (c.status === "Pending") entry.pendingCount += 1;

        entry.students.push({
          studentId,
          studentName,
          classId: classIdStr || "",
          batchId: batchIdStr || "",
          className,
          batchName,
          year: c.year ? String(c.year).trim() : "1",
          status: c.status || "Ongoing",
          universityBoard: c.universityBoard || entry.universityBoard || "—",
          index: idx,
          type: "Academic",
        });

        // Seed check
        coursesToSeed.push({ name: c.courseName.trim(), type: "Academic", universityBoard: c.universityBoard || "" });
      });
    });

    const allCoursesList = Array.from(courseMap.values()).sort((a, b) => {
      // Sort by student count descending, then by name ascending
      if (b.studentCount !== a.studentCount) {
        return b.studentCount - a.studentCount;
      }
      return a.name.localeCompare(b.name);
    });

    const islamicCourses = allCoursesList.filter((c) => c.type === "Islamic");
    const academicCourses = allCoursesList.filter((c) => c.type === "Academic");

    const islamicNames = Array.from(new Set(islamicCourses.map((c) => c.name))).sort();
    const academicNames = Array.from(new Set(academicCourses.map((c) => c.name))).sort();
    const allNames = Array.from(new Set(allCoursesList.map((c) => c.name))).sort();

    return NextResponse.json(
      {
        courses: allCoursesList,
        islamicCourses,
        academicCourses,
        courseNames: allNames,
        islamicCourseNames: islamicNames,
        academicCourseNames: academicNames,
        summary: {
          totalCourses: allCoursesList.length,
          totalIslamicCourses: islamicCourses.length,
          totalAcademicCourses: academicCourses.length,
          totalStudentsWithCourses: students.filter(
            (s) =>
              (s.studentSpecificField?.islamicCourses?.length || 0) > 0 ||
              (s.studentSpecificField?.academicCourses?.length || 0) > 0
          ).length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { message: "Failed to fetch courses", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectToDB();
    const body = await req.json();

    const { name, type = "Academic", universityBoard = "", description = "" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Course name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    // Case-insensitive search for existing course
    const existing = await Course.findOne({
      name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (existing) {
      if (universityBoard && !existing.universityBoard) {
        existing.universityBoard = universityBoard.trim();
        await existing.save();
      }
      return NextResponse.json(
        { course: existing, message: "Course already exists" },
        { status: 200 }
      );
    }

    const newCourse = await Course.create({
      name: cleanName,
      type: ["Islamic", "Academic", "Both"].includes(type) ? type : "Academic",
      universityBoard: universityBoard?.trim() || "",
      description: description?.trim() || "",
    });

    return NextResponse.json(
      { course: newCourse, message: "Course saved successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving course:", error);
    return NextResponse.json(
      { message: "Failed to save course", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    let courseName = url.searchParams.get("name") || url.searchParams.get("courseName");

    if (!courseName) {
      try {
        const body = await req.json();
        courseName = body?.name || body?.courseName;
      } catch (e) {
        // empty body
      }
    }

    if (!courseName || !courseName.trim()) {
      return NextResponse.json(
        { message: "Course name is required" },
        { status: 400 }
      );
    }

    const cleanName = courseName.trim();
    const regex = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    // 1. Delete from Course collection
    const deleteResult = await Course.deleteMany({ name: { $regex: regex } });

    // 2. Also remove from student qualification/courses so that it is completely purged
    await User.updateMany(
      {
        $or: [
          { "studentSpecificField.islamicCourses.courseName": { $regex: regex } },
          { "studentSpecificField.academicCourses.courseName": { $regex: regex } },
        ],
      },
      {
        $pull: {
          "studentSpecificField.islamicCourses": { courseName: { $regex: regex } },
          "studentSpecificField.academicCourses": { courseName: { $regex: regex } },
        },
      }
    );

    return NextResponse.json(
      {
        message: `Course "${cleanName}" removed successfully`,
        deletedCount: deleteResult.deletedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { message: "Failed to delete course", error: error.message },
      { status: 500 }
    );
  }
}

