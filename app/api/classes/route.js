import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
import { NextResponse } from "next/server";
 
export const dynamic = "force-dynamic";

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
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true })
      .lean();

    // Get total count for pagination info
    const total = await Class.countDocuments(query);

    const formattedClasses = classes.map((cls) => ({
      ...cls,
      shortname: cls.shortname,
      batchName: cls.batchId?.name,
      teacherName: cls.teacherId?.name,
      subjectsName: (cls.subjects || []).map((subject) => subject?.name || ""),
      subjectIds: (cls.subjects || []).map((subject) => subject?._id || subject),
    }));

    // Classes are already sorted by _id in the MongoDB query.

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

    const { _id, name, shortname, batchId, teacherId, subjectIds } = await req.json();
    const newClass = await Class.create({
      _id,
      name,
      shortname,
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

    const rawBody = await req.json();
    console.log("DEBUG: Class PUT rawBody:", JSON.stringify(rawBody, null, 2));
    const body = rawBody.data || rawBody;
    console.log("DEBUG: Class PUT body:", JSON.stringify(body, null, 2));
    const { ids, name, shortname, batchId, teacherId, subjectIds } = body;

    if (!ids || !ids.length) {
      return NextResponse.json({ message: "No IDs provided" }, { status: 400 });
    }

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedClasses = await Class.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            name,
            shortname,
            batchId,
            teacherId,
            subjects: subjectIds,
          },
        }
      );
      return NextResponse.json(
        { updatedClasses, message: "Classes Updated successfully!" },
        { status: 200 }
      );
    }

    // Direct update with strict: false to ensure the new field is saved
    const updatedClass = await Class.findOneAndUpdate(
      { _id },
      { 
        $set: { 
          name, 
          shortname, 
          batchId, 
          teacherId, 
          subjects: subjectIds 
        } 
      },
      { new: true, runValidators: true, strict: false }
    );

    if (!updatedClass) {
      return NextResponse.json({ message: "Class not found" }, { status: 404 });
    }

    return NextResponse.json(
      { updatedClass, message: "Class Updated successfully!" },
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
