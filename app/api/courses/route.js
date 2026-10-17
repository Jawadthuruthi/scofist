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

    // 3. Aggregate courses by normalized course name and university board
    const courseMap = new Map();

    // Helper to register course in map
    const registerCourseEntry = (name, type, defaultBoard = "") => {
      const cleanName = (name || "").trim();
      const cleanType = type === "Islamic" ? "Islamic" : "Academic";
      const cleanBoard = (defaultBoard || "").trim();
      const key = `${cleanType.toLowerCase()}:${cleanName.toLowerCase()}:${cleanBoard.toLowerCase()}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          name: cleanName,
          type: cleanType,
          universityBoard: cleanBoard,
          studentCount: 0,
          completedCount: 0,
          ongoingCount: 0,
          pendingCount: 0,
          droppedCount: 0,
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
        let board = (c.universityBoard || "").trim();
        if (!board) {
          const matchingMaster = masterCourses.filter(
            (mc) =>
              mc.name?.trim().toLowerCase() === c.courseName.trim().toLowerCase() &&
              (mc.type === "Islamic" || mc.type === "Both")
          );
          if (matchingMaster.length === 1 && matchingMaster[0].universityBoard) {
            board = matchingMaster[0].universityBoard.trim();
          }
        }
        const entry = registerCourseEntry(c.courseName, "Islamic", board);
        if (!entry.universityBoard && board) {
          entry.universityBoard = board;
        }

        entry.studentCount += 1;
        if (c.status === "Completed") entry.completedCount += 1;
        else if (c.status === "Ongoing") entry.ongoingCount += 1;
        else if (c.status === "Pending") entry.pendingCount += 1;
        else if (c.status === "Dropped") entry.droppedCount = (entry.droppedCount || 0) + 1;

        entry.students.push({
          studentId,
          studentName,
          classId: classIdStr || "",
          batchId: batchIdStr || "",
          className,
          batchName,
          year: c.year ? String(c.year).trim() : "1",
          status: c.status || "Ongoing",
          universityBoard: board || entry.universityBoard || "—",
          index: idx,
          type: "Islamic",
        });

        // Seed check
        coursesToSeed.push({ name: c.courseName.trim(), type: "Islamic", universityBoard: board });
      });

      // Academic courses
      const academicList = student.studentSpecificField?.academicCourses || [];
      academicList.forEach((c, idx) => {
        if (!c.courseName?.trim()) return;
        let board = (c.universityBoard || "").trim();
        if (!board) {
          const matchingMaster = masterCourses.filter(
            (mc) =>
              mc.name?.trim().toLowerCase() === c.courseName.trim().toLowerCase() &&
              (mc.type === "Academic" || mc.type === "Both")
          );
          if (matchingMaster.length === 1 && matchingMaster[0].universityBoard) {
            board = matchingMaster[0].universityBoard.trim();
          }
        }
        const entry = registerCourseEntry(c.courseName, "Academic", board);
        if (!entry.universityBoard && board) {
          entry.universityBoard = board;
        }

        entry.studentCount += 1;
        if (c.status === "Completed") entry.completedCount += 1;
        else if (c.status === "Ongoing") entry.ongoingCount += 1;
        else if (c.status === "Pending") entry.pendingCount += 1;
        else if (c.status === "Dropped") entry.droppedCount = (entry.droppedCount || 0) + 1;

        entry.students.push({
          studentId,
          studentName,
          classId: classIdStr || "",
          batchId: batchIdStr || "",
          className,
          batchName,
          year: c.year ? String(c.year).trim() : "1",
          status: c.status || "Ongoing",
          universityBoard: board || entry.universityBoard || "—",
          index: idx,
          type: "Academic",
        });

        // Seed check
        coursesToSeed.push({ name: c.courseName.trim(), type: "Academic", universityBoard: board });
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
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
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
    const cleanBoard = (universityBoard || "").trim();
    const cleanType = ["Islamic", "Academic", "Both"].includes(type) ? type : "Academic";

    const nameRegex = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    const query = {
      name: { $regex: nameRegex },
      $or: [{ type: cleanType }, { type: "Both" }],
    };

    if (cleanBoard) {
      query.universityBoard = {
        $regex: new RegExp(`^${cleanBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      };
    } else {
      query.$or = [
        { universityBoard: "" },
        { universityBoard: null },
        { universityBoard: { $exists: false } },
      ];
    }

    // Case-insensitive search for existing course with matching board & type
    const existing = await Course.findOne(query);

    if (existing) {
      if (cleanBoard && !existing.universityBoard) {
        existing.universityBoard = cleanBoard;
        await existing.save();
      }
      return NextResponse.json(
        { course: existing, message: "Course already exists" },
        { status: 200 }
      );
    }

    const newCourse = await Course.create({
      name: cleanName,
      type: cleanType,
      universityBoard: cleanBoard,
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
    let courseType = url.searchParams.get("type");
    let universityBoard = url.searchParams.get("universityBoard");

    if (!courseName) {
      try {
        const body = await req.json();
        courseName = body?.name || body?.courseName;
        courseType = courseType || body?.type;
        universityBoard = universityBoard || body?.universityBoard;
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
    const cleanBoard = (universityBoard || "").trim();
    const nameRegex = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    // 1. Delete from Course collection
    const courseDeleteQuery = { name: { $regex: nameRegex } };
    if (courseType && courseType !== "Both") {
      courseDeleteQuery.$or = [{ type: courseType }, { type: "Both" }];
    }
    if (cleanBoard) {
      courseDeleteQuery.universityBoard = {
        $regex: new RegExp(`^${cleanBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      };
    }
    const deleteResult = await Course.deleteMany(courseDeleteQuery);

    // 2. Also remove from student qualification/courses
    const islamicPullFilter = { courseName: { $regex: nameRegex } };
    const academicPullFilter = { courseName: { $regex: nameRegex } };
    if (cleanBoard) {
      const boardRegex = new RegExp(`^${cleanBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      islamicPullFilter.universityBoard = { $regex: boardRegex };
      academicPullFilter.universityBoard = { $regex: boardRegex };
    }

    const pullObj = {};
    const orClauses = [];
    if (!courseType || courseType === "Islamic" || courseType === "Both") {
      pullObj["studentSpecificField.islamicCourses"] = islamicPullFilter;
      orClauses.push({ "studentSpecificField.islamicCourses": { $elemMatch: islamicPullFilter } });
    }
    if (!courseType || courseType === "Academic" || courseType === "Both") {
      pullObj["studentSpecificField.academicCourses"] = academicPullFilter;
      orClauses.push({ "studentSpecificField.academicCourses": { $elemMatch: academicPullFilter } });
    }

    if (orClauses.length > 0) {
      await User.updateMany({ $or: orClauses }, { $pull: pullObj });
    }

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
      const { courseName, type, universityBoard, oldYear, newYear } = body;
      if (!courseName || !oldYear || !newYear) {
        return NextResponse.json(
          { message: "courseName, oldYear, and newYear are required" },
          { status: 400 }
        );
      }

      const cleanCourse = courseName.trim();
      const cleanOldYear = String(oldYear).trim();
      const cleanNewYear = String(newYear).trim();
      const cleanBoard = (universityBoard || "").trim();
      const nameRegex = new RegExp(
        `^${cleanCourse.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );

      const elemFilter = { "elem.courseName": { $regex: nameRegex }, "elem.year": cleanOldYear };
      const rootFilter = { courseName: { $regex: nameRegex }, year: cleanOldYear };
      if (cleanBoard) {
        const boardRegex = new RegExp(`^${cleanBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
        elemFilter["elem.universityBoard"] = { $regex: boardRegex };
        rootFilter.universityBoard = { $regex: boardRegex };
      }

      const updateTarget = (field) =>
        User.updateMany(
          {
            [field]: { $elemMatch: rootFilter },
          },
          {
            $set: {
              [`${field}.$[elem].year`]: cleanNewYear,
            },
          },
          {
            arrayFilters: [elemFilter],
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
      const { courseName, type, universityBoard, year } = body;
      if (!courseName || !year) {
        return NextResponse.json(
          { message: "courseName and year are required" },
          { status: 400 }
        );
      }

      const cleanCourse = courseName.trim();
      const cleanYear = String(year).trim();
      const cleanBoard = (universityBoard || "").trim();
      const regex = new RegExp(
        `^${cleanCourse.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );

      const elemMatch = { courseName: { $regex: regex }, year: cleanYear };
      if (cleanBoard) {
        elemMatch.universityBoard = {
          $regex: new RegExp(`^${cleanBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        };
      }

      const pullQuery = {};
      const orConditions = [];
      if (!type || type === "Islamic") {
        pullQuery["studentSpecificField.islamicCourses"] = elemMatch;
        orConditions.push({ "studentSpecificField.islamicCourses": { $elemMatch: elemMatch } });
      }
      if (!type || type === "Academic") {
        pullQuery["studentSpecificField.academicCourses"] = elemMatch;
        orConditions.push({ "studentSpecificField.academicCourses": { $elemMatch: elemMatch } });
      }

      if (orConditions.length > 0) {
        await User.updateMany(
          { $or: orConditions },
          { $pull: pullQuery }
        );
      }

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
      oldUniversityBoard = "",
    } = body;
    const lookupName = (oldName || name || "").trim();
    const newName = (name || oldName || "").trim();
    const cleanBoard = (universityBoard || "").trim();
    const cleanOldBoard = (oldUniversityBoard || "").trim();
    const newType = ["Islamic", "Academic", "Both"].includes(type)
      ? type
      : "Academic";

    if (!lookupName || !newName) {
      return NextResponse.json(
        { message: "Course name is required", error: "Course name is required" },
        { status: 400 }
      );
    }

    const oldRegex = new RegExp(
      `^${lookupName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
    const newNameRegex = new RegExp(
      `^${newName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );

    const isIdentityChanging =
      lookupName.toLowerCase() !== newName.toLowerCase() ||
      cleanOldBoard.toLowerCase() !== cleanBoard.toLowerCase() ||
      (oldType && oldType !== newType);

    // 1. If renaming/moving to a course that already exists with the same name, type, and board, handle as MERGE
    let targetCourse = null;
    if (isIdentityChanging) {
      const targetQuery = {
        name: { $regex: newNameRegex },
        $or: [{ type: newType }, { type: "Both" }],
      };
      if (cleanBoard) {
        targetQuery.universityBoard = {
          $regex: new RegExp(`^${cleanBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        };
      } else {
        targetQuery.$or = [
          { universityBoard: "" },
          { universityBoard: null },
          { universityBoard: { $exists: false } },
        ];
      }
      targetCourse = await Course.findOne(targetQuery);
      if (
        targetCourse &&
        lookupName.toLowerCase() === targetCourse.name.toLowerCase() &&
        cleanOldBoard.toLowerCase() === (targetCourse.universityBoard || "").toLowerCase()
      ) {
        targetCourse = null; // Same course, not a merge
      }
    }

    if (isIdentityChanging && targetCourse) {
      // ── MERGE: Move all students from old course name into target course ──
      const setIslamic = {
        "studentSpecificField.islamicCourses.$[elem].courseName": targetCourse.name,
      };
      if (cleanBoard) {
        setIslamic["studentSpecificField.islamicCourses.$[elem].universityBoard"] = cleanBoard;
      }
      const islamicFilter = { "elem.courseName": { $regex: oldRegex } };
      if (cleanOldBoard) {
        islamicFilter["elem.universityBoard"] = {
          $regex: new RegExp(`^${cleanOldBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        };
      }
      await User.updateMany(
        { "studentSpecificField.islamicCourses.courseName": { $regex: oldRegex } },
        { $set: setIslamic },
        { arrayFilters: [islamicFilter] }
      );

      const setAcademic = {
        "studentSpecificField.academicCourses.$[elem].courseName": targetCourse.name,
      };
      if (cleanBoard) {
        setAcademic["studentSpecificField.academicCourses.$[elem].universityBoard"] = cleanBoard;
      }
      const academicFilter = { "elem.courseName": { $regex: oldRegex } };
      if (cleanOldBoard) {
        academicFilter["elem.universityBoard"] = {
          $regex: new RegExp(`^${cleanOldBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        };
      }
      await User.updateMany(
        { "studentSpecificField.academicCourses.courseName": { $regex: oldRegex } },
        { $set: setAcademic },
        { arrayFilters: [academicFilter] }
      );

      // Remove the old master course
      const oldDeleteQuery = { name: { $regex: oldRegex } };
      if (cleanOldBoard) {
        oldDeleteQuery.universityBoard = {
          $regex: new RegExp(`^${cleanOldBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        };
      }
      await Course.deleteMany(oldDeleteQuery);

      if (cleanBoard && !targetCourse.universityBoard) {
        targetCourse.universityBoard = cleanBoard;
        await targetCourse.save();
      }

      return NextResponse.json(
        {
          message: `Course "${lookupName}" merged into "${targetCourse.name}" successfully`,
          course: {
            name: targetCourse.name,
            type: targetCourse.type,
            universityBoard: targetCourse.universityBoard || cleanBoard,
          },
          merged: true,
          mergedInto: targetCourse.name,
        },
        { status: 200 }
      );
    }

    // 2. Find existing master course in Course collection
    let existing = null;
    const existingQuery = { name: { $regex: oldRegex } };
    if (oldType) {
      existingQuery.$or = [{ type: oldType }, { type: "Both" }];
    }
    if (cleanOldBoard) {
      existingQuery.universityBoard = {
        $regex: new RegExp(`^${cleanOldBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      };
    }
    existing = await Course.findOne(existingQuery);
    if (!existing) {
      existing = await Course.findOne({ name: { $regex: oldRegex } });
    }

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

    // 3. Cascade changes to students
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
      }).lean();

      for (const student of studentsWithCourse) {
        const fromList = student.studentSpecificField?.[fromField] || [];
        const toList = student.studentSpecificField?.[toField] || [];

        const matchingItems = fromList.filter((c) => {
          const nameMatch = oldRegex.test(c.courseName || "");
          const boardMatch = !cleanOldBoard || (c.universityBoard || "").toLowerCase() === cleanOldBoard.toLowerCase();
          return nameMatch && boardMatch;
        });
        const remainingItems = fromList.filter((c) => {
          const nameMatch = oldRegex.test(c.courseName || "");
          const boardMatch = !cleanOldBoard || (c.universityBoard || "").toLowerCase() === cleanOldBoard.toLowerCase();
          return !(nameMatch && boardMatch);
        });

        const movedItems = matchingItems.map((c) => ({
          courseName: newName,
          universityBoard: cleanBoard || c.universityBoard || "",
          year: c.year ? String(c.year).trim() : "1",
          status: c.status || "Ongoing",
        }));

        await User.updateOne(
          { _id: student._id },
          {
            $set: {
              [`studentSpecificField.${fromField}`]: remainingItems,
              [`studentSpecificField.${toField}`]: [...toList, ...movedItems],
            },
          }
        );
      }
    } else {
      // In-place updates in students
      const updateIslamic =
        newType === "Islamic" ||
        newType === "Both" ||
        oldType === "Islamic" ||
        !oldType;

      const updateAcademic =
        newType === "Academic" ||
        newType === "Both" ||
        oldType === "Academic" ||
        !oldType;

      const setObjIslamic = {
        "studentSpecificField.islamicCourses.$[elem].courseName": newName,
        "studentSpecificField.islamicCourses.$[elem].universityBoard": cleanBoard,
      };

      const setObjAcademic = {
        "studentSpecificField.academicCourses.$[elem].courseName": newName,
        "studentSpecificField.academicCourses.$[elem].universityBoard": cleanBoard,
      };

      const elemFilter = { "elem.courseName": { $regex: oldRegex } };
      const rootFilter = { courseName: { $regex: oldRegex } };
      if (cleanOldBoard) {
        const boardRegex = new RegExp(`^${cleanOldBoard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
        elemFilter["elem.universityBoard"] = { $regex: boardRegex };
        rootFilter.universityBoard = { $regex: boardRegex };
      }

      if (updateIslamic) {
        await User.updateMany(
          {
            "studentSpecificField.islamicCourses": { $elemMatch: rootFilter },
          },
          { $set: setObjIslamic },
          { arrayFilters: [elemFilter] }
        );
      }

      if (updateAcademic) {
        await User.updateMany(
          {
            "studentSpecificField.academicCourses": { $elemMatch: rootFilter },
          },
          { $set: setObjAcademic },
          { arrayFilters: [elemFilter] }
        );
      }
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
    if (error.code === 11000) {
      return NextResponse.json(
        {
          message: "A course with this name and university board already exists",
          error: "A course with this name and university board already exists",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        message: error.message || "Failed to update course",
        error: error.message || "Failed to update course",
      },
      { status: 500 }
    );
  }
}

