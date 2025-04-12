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

    // Execute query with pagination
    const classes = await Class.find(query, projections)
      .populate("batchId", "name")
      .populate("teacherId", "name")
      .populate("subjects", "name")
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 });

    // Get total count for pagination info
    const total = await Class.countDocuments(query);

    const formattedClasses = classes.map((cls) => ({
      ...cls._doc,
      batchId: cls.batchId?._id,
      teacherId: cls.teacherId?._id,
      batchName: cls.batchId?.name,
      teacherName: cls.teacherId?.name,
      subjects: cls.subjects.map((subject) => subject?._id),
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
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit) - 1),
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

    const { _id, name, batchId, teacherId, subjects } = await req.json();
    const newClass = await Class.create({
      _id,
      name,
      batchId,
      teacherId,
      subjects,
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
    const { ids, name, batchId, teacherId, subjects } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedClasses = await Class.updateMany(
        { _id: { $in: ids } },
        { $set: { name, batchId, teacherId, subjects } }
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

    Object.assign(existingClass, { name, batchId, teacherId, subjects });

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
