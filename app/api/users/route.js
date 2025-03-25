import { apiResponse } from "@/lib/apiResponse";
import { verifyToken } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    const apiKey = req.headers.get("api-key");
    await connectToDB();
    const authorized = await verifyToken(apiKey);
    if (!authorized) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "0");

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
        projections[field] = 1;
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.role) {
      query.roles = { $in: filterParams.role };
    }
    if (filterParams.status) {
      query.status = filterParams.status;
    }

    // Execute query with pagination
    const users = await User.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .sort({ updatedAt: -1 });

    // Get total count for pagination info
    const total = await User.countDocuments(query);

    const formattedUsers = users.map((user) => {
      return {
        ...user._doc,
        ...user.address,
        ...user.teacherSpecificField,
        ...user.studentSpecificField,
        address: {
          ...user.address,
          postOffice: user.postOffice ? `PO. ${user.postOffice}` : null,
        },
      };
    });

    return NextResponse.json(
      {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) - 1,
        },
        message: "Users fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    const apiKey = req.headers.get("api-key");
    await connectToDB();
    const authorized = await verifyToken(apiKey);
    if (!authorized) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const {
      _id,
      name,
      email,
      profilePic,
      roles,
      contactNumber,
      alternativeNumber,
      dateOfBirth,
      dateOfJoining,
      houseName,
      place,
      postOffice,
      district,
      state,
      pin,
      status,
      admissionClassId,
      admissionDate,
      aadharNo,
      bloodGroup,
      guardianName,
      guardianNumber,
      relationship,
      islamicQualification,
      academicQualification,
      droppedOutDate,
      droppedOutClass,
      droppedOutReason,
      graduatedYear,
      classId,
      batchId,
    } = body;
    const newUser = await User.create({
      _id,
      name,
      email,
      profilePic,
      roles,
      contactNumber,
      alternativeNumber,
      dateOfBirth,
      teacherSpecificField: {
        dateOfJoining,
        status,
      },
      studentSpecificField: {
        admissionClassId,
        admissionDate,
        aadharNo,
        bloodGroup,
        guardianName,
        guardianNumber,
        relationship,
        islamicQualification,
        academicQualification,
        droppedOutDate,
        droppedOutClass,
        droppedOutReason,
        graduatedYear,
        classId,
        batchId,
      },
      address: {
        houseName,
        place,
        postOffice,
        district,
        state,
        pin,
      },
    });
    return NextResponse.json(
      { newUser, message: "User created successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    const apiKey = req.headers.get("api-key");
    await connectToDB();
    const authorized = await verifyToken(apiKey);
    if (!authorized) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const {
      ids,
      name,
      email,
      profilePic,
      roles,
      contactNumber,
      alternativeNumber,
      dateOfBirth,
      dateOfJoining,
      houseName,
      place,
      postOffice,
      district,
      state,
      pin,
      status,
      admissionClassId,
      admissionDate,
      aadharNo,
      bloodGroup,
      guardianName,
      guardianNumber,
      relationship,
      islamicQualification,
      academicQualification,
      droppedOutDate,
      droppedOutClass,
      droppedOutReason,
      graduatedYear,
      classId,
      batchId,
    } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedUsers = await User.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            name,
            email,
            profilePic,
            roles,
            contactNumber,
            alternativeNumber,
            dateOfBirth,
            teacherSpecificField: {
              dateOfJoining,
            },
            studentSpecificField: {
              admissionClassId,
              admissionDate,
              aadharNo,
              bloodGroup,
              guardianName,
              guardianNumber,
              relationship,
              islamicQualification,
              academicQualification,
              droppedOutDate,
              droppedOutClass,
              droppedOutReason,
              graduatedYear,
              classId,
              batchId,
            },
            address: {
              houseName,
              place,
              postOffice,
              district,
              state,
              pin,
            },
            status,
          },
        }
      );
      return NextResponse.json(
        { updatedUsers, message: "Users updated successfully" },
        { status: 200 }
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id },
      {
        name,
        email,
        profilePic,
        roles,
        contactNumber,
        alternativeNumber,
        dateOfBirth,
        teacherSpecificField: {
          dateOfJoining,
        },
        studentSpecificField: {
          admissionClassId,
          admissionDate,
          aadharNo,
          bloodGroup,
          guardianName,
          guardianNumber,
          relationship,
          islamicQualification,
          academicQualification,
          droppedOutDate,
          droppedOutClass,
          droppedOutReason,
          graduatedYear,
          classId,
          batchId,
        },
        address: {
          houseName,
          place,
          postOffice,
          district,
          state,
          pin,
        },
        status,
      },
      { new: true }
    );
    return NextResponse.json(
      { updatedUser, message: "User updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    const apiKey = req.headers.get("api-key");
    await connectToDB();
    const authorized = await verifyToken(apiKey);
    if (!authorized) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const usersToDelete = await User.find(
        { _id: { $in: ids } },
        "profilePic"
      );

      const publicIds = usersToDelete
        .map((user) => user.profilePic.publicId)
        .filter(Boolean);
      const deletedUsers = await User.deleteMany({ _id: { $in: ids } });
      await cloudinary.api.delete_resources(publicIds);
      return NextResponse.json(
        { deletedUsers, message: "Users deleted successfully" },
        { status: 200 }
      );
    }
    const deletedUser = await User.findByIdAndDelete(_id);

    if (deletedUser && deletedUser.profilePic.publicId) {
      await cloudinary.uploader.destroy(deletedUser.profilePic.publicId);
    }

    return NextResponse.json(
      { deletedUser, message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
