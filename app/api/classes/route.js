import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams?._id) {
      query._id = filterParams?._id;
    }
    if (filterParams.batchId) {
      query.batchId = filterParams.batchId;
    }
    if (filterParams.teacherId) {
      query.teacherId = filterParams.teacherId;
    }

    // Execute query to get all classes matching the filter
    const allClasses = await Class.find(query, projections)
      .populate("batchId", "name")
      .populate("teacherId", "name")
      .populate("subjects", "name")
      .collation({ locale: "en_US", numericOrdering: true });

    // Define the custom sort order
    const classOrder = [
      "PLUS ONE A",
      "PLUS ONE B",
      "PLUS TWO",
      "DEGREE FIRST YEAR",
      "DEGREE SECOND YEAR",
      "DEGREE THIRD YEAR",
      "PG FIRST YEAR",
      "PG SECOND YEAR",
      "8TH STD",
      "9TH STD",
      "10TH STD",
    ];

    // Apply custom sorting to the full list of classes
    allClasses.sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      const indexA = classOrder.indexOf(nameA);
      const indexB = classOrder.indexOf(nameB);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) {
        return -1; // a comes first
      }
      if (indexB !== -1) {
        return 1; // b comes first
      }
      // Fallback for classes not in the custom order
      return nameA.localeCompare(nameB);
    });

    // Get total count for pagination info
    const total = allClasses.length;

    // Apply pagination manually after sorting
    const startIndex = page * limit;
    const paginatedClasses =
      limit === Infinity
        ? allClasses
        : allClasses.slice(startIndex, startIndex + limit);

    const formattedClasses = paginatedClasses.map((cls) => ({
      ...cls._doc,
      batchId: cls.batchId?._id,
      teacherId: cls.teacherId?._id,
      batchName: cls.batchId?.name,
      teacherName: cls.teacherId?.name,
      subjectIds: cls.subjects.map((subject) => subject?._id),
      subjectsName: cls.subjects.map((subject) => subject.name),
    }));

    return NextResponse.json(
      {
        classes: formattedClasses,

    const formattedClasses = classes.map((cls) => ({
      ...cls._doc,
      batchId: cls.batchId?._id,
      teacherId: cls.teacherId?._id,
      batchName: cls.batchId?.name,
      teacherName: cls.teacherId?.name,
      subjectIds: cls.subjects.map((subject) => subject?._id),
      subjectsName: cls.subjects.map((subject) => subject.name),
    }));

    return NextResponse.json(
      {
        classes: formattedClasses,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Classes fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const { _id, name, batchId, teacherId, subjectIds } = await req.json();
    const newClass = await Class.create({
      _id,
      name,
      batchId,
      teacherId,
      subjects: subjectIds,
    });
    return NextResponse.json(
      { newClass, message: "Class created successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { ids, name, batchId, teacherId, subjectIds } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedClasses = await Class.updateMany(
        { _id: { $in: ids } },
        { $set: { name, batchId, teacherId, subjects: subjectIds } }
      );
      return NextResponse.json(
        { updatedClasses, message: "Classes Updated successfully!" },
        { status: 200 }
      );
    }

    const existingClass = await Class.findById(_id);
    if (!existingClass) {
      return NextResponse.json({ message: "Class not found" }, { status: 404 });
    }

    Object.assign(existingClass, {
      name,
      batchId,
      teacherId,
      subjects: subjectIds,
    });

    await existingClass.save();

    return NextResponse.json(
      { message: "Class Updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const deletedClasses = await Class.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedClasses, message: "Classes deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedClass = await Class.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedClass, message: "Class deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
