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

export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { action } = body;

    // ── Action: Update year for all students enrolled in this course year ───
    if (action === "updateYear") {
      const { courseName, type, oldYear, newYear } = body;
      if (!courseName || !oldYear || !newYear) {
        return NextResponse.json(
          { message: "courseName, oldYear, and newYear are required" },
          { status: 400 }
        );
      }

      const cleanCourse = courseName.trim();
      const cleanOldYear = String(oldYear).trim();
      const cleanNewYear = String(newYear).trim();
      const regex = new RegExp(
        `^${cleanCourse.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );

      const updateTarget = (field) =>
        User.updateMany(
          {
            [`${field}.courseName`]: { $regex: regex },
            [`${field}.year`]: cleanOldYear,
          },
          {
            $set: {
              [`${field}.$[elem].year`]: cleanNewYear,
            },
          },
          {
            arrayFilters: [
              { "elem.courseName": { $regex: regex }, "elem.year": cleanOldYear },
            ],
          }
        );

      if (!type || type === "Islamic") {
        await updateTarget("studentSpecificField.islamicCourses");
      }
      if (!type || type === "Academic") {
        await updateTarget("studentSpecificField.academicCourses");
      }

      return NextResponse.json(
        {
          message: `Year ${cleanOldYear} updated to ${cleanNewYear} for course "${cleanCourse}"`,
        },
        { status: 200 }
      );
    }

    // ── Action: Delete a specific year for all students enrolled ───────────
    if (action === "deleteYear") {
      const { courseName, type, year } = body;
      if (!courseName || !year) {
        return NextResponse.json(
          { message: "courseName and year are required" },
          { status: 400 }
        );
      }

      const cleanCourse = courseName.trim();
      const cleanYear = String(year).trim();
      const regex = new RegExp(
        `^${cleanCourse.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );

      const pullQuery = {};
      if (!type || type === "Islamic") {
        pullQuery["studentSpecificField.islamicCourses"] = {
          courseName: { $regex: regex },
          year: cleanYear,
        };
      }
      if (!type || type === "Academic") {
        pullQuery["studentSpecificField.academicCourses"] = {
          courseName: { $regex: regex },
          year: cleanYear,
        };
      }

      await User.updateMany(
        {
          $or: [
            {
              "studentSpecificField.islamicCourses": {
                $elemMatch: { courseName: { $regex: regex }, year: cleanYear },
              },
            },
            {
              "studentSpecificField.academicCourses": {
                $elemMatch: { courseName: { $regex: regex }, year: cleanYear },
              },
            },
          ],
        },
        {
          $pull: pullQuery,
        }
      );

      return NextResponse.json(
        {
          message: `Year ${cleanYear} removed for course "${cleanCourse}"`,
        },
        { status: 200 }
      );
    }

    // ── Action: Edit master course (Name, Type, University/Board) ───────────
    const {
      oldName,
      name,
      type = "Academic",
      universityBoard = "",
      oldType,
    } = body;
    const lookupName = (oldName || name || "").trim();
    const newName = (name || oldName || "").trim();
    const cleanBoard = (universityBoard || "").trim();
    const newType = ["Islamic", "Academic", "Both"].includes(type)
      ? type
      : "Academic";

    if (!lookupName || !newName) {
      return NextResponse.json(
        { message: "Course name is required" },
        { status: 400 }
      );
    }

    const oldRegex = new RegExp(
      `^${lookupName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );

    // 1. Update or create in Course collection
    const existing = await Course.findOne({ name: { $regex: oldRegex } });
    if (existing) {
      existing.name = newName;
      existing.type = newType;
      existing.universityBoard = cleanBoard;
      await existing.save();
    } else {
      await Course.create({
        name: newName,
        type: newType,
        universityBoard: cleanBoard,
      });
    }

    // 2. Cascade changes to students
    const sourceIsIslamic = oldType
      ? oldType === "Islamic"
      : existing
      ? existing.type === "Islamic"
      : false;
    const targetIsIslamic = newType === "Islamic";
    const typeFlipped =
      oldType && oldType !== newType && newType !== "Both";

    if (
      typeFlipped &&
      ((sourceIsIslamic && !targetIsIslamic) ||
        (!sourceIsIslamic && targetIsIslamic))
    ) {
      // Type flipped between Islamic and Academic
      const fromField = sourceIsIslamic ? "islamicCourses" : "academicCourses";
      const toField = targetIsIslamic ? "islamicCourses" : "academicCourses";

      const studentsWithCourse = await User.find({
        [`studentSpecificField.${fromField}.courseName`]: { $regex: oldRegex },
      });

      for (const student of studentsWithCourse) {
        const fromList = student.studentSpecificField?.[fromField] || [];
        const toList = student.studentSpecificField?.[toField] || [];

        const matchingItems = fromList.filter((c) =>
          oldRegex.test(c.courseName || "")
        );
        const remainingItems = fromList.filter(
          (c) => !oldRegex.test(c.courseName || "")
        );

        const movedItems = matchingItems.map((c) => ({
          courseName: newName,
          universityBoard: cleanBoard || c.universityBoard || "",
          year: c.year || "1",
          status: c.status || "Ongoing",
        }));

        student.studentSpecificField[fromField] = remainingItems;
        student.studentSpecificField[toField] = [...toList, ...movedItems];
        await student.save();
      }
    } else {
      // In-place updates in students
      await User.updateMany(
        {
          "studentSpecificField.islamicCourses.courseName": {
            $regex: oldRegex,
          },
        },
        {
          $set: {
            "studentSpecificField.islamicCourses.$[elem].courseName": newName,
            "studentSpecificField.islamicCourses.$[elem].universityBoard":
              cleanBoard,
          },
        },
        { arrayFilters: [{ "elem.courseName": { $regex: oldRegex } }] }
      );

      await User.updateMany(
        {
          "studentSpecificField.academicCourses.courseName": {
            $regex: oldRegex,
          },
        },
        {
          $set: {
            "studentSpecificField.academicCourses.$[elem].courseName": newName,
            "studentSpecificField.academicCourses.$[elem].universityBoard":
              cleanBoard,
          },
        },
        { arrayFilters: [{ "elem.courseName": { $regex: oldRegex } }] }
      );
    }

    return NextResponse.json(
      {
        message: `Course "${newName}" updated successfully`,
        course: { name: newName, type: newType, universityBoard: cleanBoard },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { message: "Failed to update course", error: error.message },
      { status: 500 }
    );
  }
}

