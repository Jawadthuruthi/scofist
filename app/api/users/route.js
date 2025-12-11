import { apiResponse } from "@/lib/apiResponse";
import cloudinary from "@/lib/cloudinary";
import connectToDB from "@/lib/db";
import User from "@/models/User";
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
        projections[field.trim()] = 1;
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams._id;
    }
    if (filterParams.classId) {
      query["studentSpecificField.classId"] = {
        $in: filterParams.classId.split(",").map((id) => id.trim()),
      };
    }
    if (filterParams.batchId) {
      query["studentSpecificField.batchId"] = {
        $in: filterParams.batchId.split(",").map((id) => id.trim()),
      };
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.roles) {
      query.roles = {
        $in: filterParams.roles?.split(",").map((role) => role.trim()),
      };
    }
    if (filterParams.status) {
      // Handle status properly based on role
      if (filterParams.roles && filterParams.roles.includes("Student")) {
        query["studentSpecificField.status"] = filterParams.status;
      } else if (filterParams.roles && filterParams.roles.includes("Teacher")) {
        query["teacherSpecificField.status"] = filterParams.status;
      } else {
        query.status = filterParams.status;
      }
    }

    // Handle global search parameter
    const globalSearch = url.searchParams.get("global");
    if (globalSearch) {
      // Create an $or query to search across multiple fields
      const searchFields = [
        "name",
        "email",
        "contactNumber",
        "address.houseName",
        "address.place",
        "address.district",
        "address.state",
        "studentSpecificField.guardianName",
        "studentSpecificField.aadharNo",
        "studentSpecificField.bloodGroup",
        "studentSpecificField.islamicQualification",
        "studentSpecificField.academicQualification",
      ];

      query.$and = [
        ...(query.$and || []),
        {
          $or: searchFields.map((field) => ({
            [field]: { $regex: globalSearch, $options: "i" },
          })),
        },
      ];
    }

    // Use lean for better performance when appropriate
    let usersQuery = User.find(query, projections)
      .populate("studentSpecificField.batchId")
      .populate("studentSpecificField.classId")
      .populate("studentSpecificField.admissionClassId", "name")
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });

    if (url.searchParams.get("populate") === "funds") {
      usersQuery = usersQuery.populate("funds");
    }

    const users = await usersQuery;

    // Get total count for pagination info - use efficient counting
    const total = await User.countDocuments(query);

    // Optimize the data transformation to avoid deep cloning
    const formattedUsers = users.map((user) => {
      // Handle null/undefined safely
      const address = user.address || {};
      const teacherSpecificField = user.teacherSpecificField || {};
      const studentSpecificField = user.studentSpecificField || {};

      // Format the user data efficiently
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        contactNumber: user.contactNumber,
        alternativeNumber: user.alternativeNumber,
        dateOfBirth: user.dateOfBirth,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // Address fields
        houseName: address.houseName,
        place: address.place,
        postOffice: address.postOffice,
        district: address.district,
        state: address.state,
        pin: address.pin,

        // Keep address object as well with formatted postOffice
        address: {
          ...address,
          postOffice: address.postOffice ? `PO. ${address.postOffice}` : null,
        },

        // Teacher specific fields
        dateOfJoining: teacherSpecificField.dateOfJoining,
        teacherStatus: teacherSpecificField.status,

        // Student specific fields
        admissionClassId: studentSpecificField.admissionClassId?._id,
        admissionClassName: studentSpecificField.admissionClassId?.name,
        admissionDate: studentSpecificField.admissionDate,
        aadharNo: studentSpecificField.aadharNo,
        bloodGroup: studentSpecificField.bloodGroup,
        guardianName: studentSpecificField.guardianName,
        guardianContactNumber: studentSpecificField.guardianContactNumber,
        guardianAlternativeNumber:
          studentSpecificField.guardianAlternativeNumber,
        relationship: studentSpecificField.relationship,
        studentStatus: studentSpecificField.status,
        islamicQualification: studentSpecificField.islamicQualification,
        academicQualification: studentSpecificField.academicQualification,
        droppedOutDate: studentSpecificField.droppedOutDate,
        droppedOutClass: studentSpecificField.droppedOutClass,
        droppedOutReason: studentSpecificField.droppedOutReason,
        graduatedYear: studentSpecificField.graduatedYear,

        // Class and batch references
        classId: studentSpecificField.classId?._id,
        className: studentSpecificField.classId?.name,
        batchId: studentSpecificField.batchId?._id,
        batchName: studentSpecificField.batchId?.name,
        classData: studentSpecificField.classId,
        batchData: studentSpecificField.batchId,

        status: user.roles?.includes("Student")
          ? studentSpecificField.status
          : teacherSpecificField.status,
        funds: user.funds,
      };
    });

    return NextResponse.json(
      {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Users fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const body = await req.json();

    // Validate required fields to fail fast
    if (
      !body._id ||
      !body.name ||
      !body.roles ||
      !Array.isArray(body.roles) ||
      body.roles.length === 0
    ) {
      return NextResponse.json(
        {
          message: "Required fields missing: _id, name, and roles are required",
        },
        { status: 400 }
      );
    }

    // Extract fields with correct structure
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
      guardianContactNumber,
      guardianAlternativeNumber,
      relationship,
      islamicQualification,
      academicQualification,
      droppedOutDate,
      droppedOutClass,
      droppedOutReason,
      graduatedYear,
      batchId,
      classId,
    } = body;

    // Build user object efficiently
    const userData = {
      _id,
      name,
      email,
      profilePic,
      roles,
      contactNumber,
      alternativeNumber,
      dateOfBirth,
      address: {
        houseName,
        place,
        postOffice,
        district,
        state,
        pin,
      },
    };

    // Add teacher-specific fields only when needed
    if (roles.includes("Teacher")) {
      userData.teacherSpecificField = {
        dateOfJoining,
        status,
      };
    }

    // Add student-specific fields only when needed
    if (roles.includes("Student")) {
      userData.studentSpecificField = {
        admissionClassId,
        admissionDate,
        aadharNo,
        bloodGroup,
        guardianName,
        guardianContactNumber,
        guardianAlternativeNumber,
        relationship,
        islamicQualification,
        academicQualification,
        status,
        batchId,
        classId,
      };

      // Add status-dependent fields only when they're needed
      if (status === "Dropped Out") {
        userData.studentSpecificField.droppedOutDate = droppedOutDate;
        userData.studentSpecificField.droppedOutClass = droppedOutClass;
        userData.studentSpecificField.droppedOutReason = droppedOutReason;
      } else if (status === "Graduated") {
        userData.studentSpecificField.graduatedYear = graduatedYear;
      }
    }

    console.time("User creation");
    const newUser = await User.create(userData);
    console.timeEnd("User creation");

    return NextResponse.json(
      { newUser, message: "User created successfully!" },
      { status: 200 }
    );
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { message: `User with this ${field} already exists` },
        { status: 409 }
      );
    }

    console.error("Error creating user:", error);
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();

    const { ids, ...updateFields } = body;
    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      );
    }

    const _id = ids[0];
    const user = await User.findById(_id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
      console.log(updateFields);
    }

    // Update top-level fields
    const simpleFields = [
      "name",
      "email",
      "contactNumber",
      "alternativeNumber",
      "dateOfBirth",
      "roles",
    ];
    simpleFields.forEach((field) => {
      if (updateFields[field] !== undefined) {
        user[field] = updateFields[field] || undefined;
      }
    });

    // Update profilePic
    if (
      updateFields.profilePic &&
      Object.keys(updateFields.profilePic).length > 0
    ) {
      user.profilePic = updateFields.profilePic;
    }

    // Update address
    if (!user.address) user.address = {};
    const addressFields = [
      "houseName",
      "place",
      "postOffice",
      "district",
      "state",
      "pin",
    ];
    addressFields.forEach((field) => {
      if (updateFields[field] !== undefined) {
        user.address[field] = updateFields[field] || undefined;
      }
    });

    // Update Teacher-specific fields
    if (user.roles.includes("Teacher")) {
      if (!user.teacherSpecificField) user.teacherSpecificField = {};
      if (updateFields.dateOfJoining !== undefined)
        user.teacherSpecificField.dateOfJoining = updateFields.dateOfJoining;
      if (updateFields.status !== undefined)
        user.teacherSpecificField.status = updateFields.status;
    }

    // Update Student-specific fields
    if (user.roles.includes("Student")) {
      if (!user.studentSpecificField) user.studentSpecificField = {};
      const studentFields = [
        "admissionClassId",
        "admissionDate",
        "aadharNo",
        "bloodGroup",
        "guardianName",
        "guardianContactNumber",
        "guardianAlternativeNumber",
        "relationship",
        "islamicQualification",
        "academicQualification",
        "batchId",
        "classId",
        "status",
      ];
      studentFields.forEach((field) => {
        if (updateFields[field] !== undefined) {
          user.studentSpecificField[field] = updateFields[field] || undefined;
        }
      });

      // Handle Dropped Out or Graduated fields
      if (updateFields.status === "Dropped Out") {
        ["droppedOutDate", "droppedOutClass", "droppedOutReason"].forEach(
          (field) => {
            if (updateFields[field] !== undefined) {
              user.studentSpecificField[field] =
                updateFields[field] || undefined;
            }
          }
        );
      } else if (updateFields.status === "Graduated") {
        if (updateFields.graduatedYear !== undefined) {
          user.studentSpecificField.graduatedYear = updateFields.graduatedYear;
        }
      }
    }

    // Save the user
    await user.save();

    return NextResponse.json(
      { updatedUser: user, message: "User updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { message: `User with this ${field} already exists` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();

    if (!ids || !ids.length) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      );
    }

    console.time("Delete operation");

    // Batch delete
    if (ids.length > 1) {
      // Get profile pic IDs in one query with lean
      const users = await User.find(
        { _id: { $in: ids } },
        { "profilePic.publicId": 1 }
      ).lean();

      const publicIds = users
        .map((user) => user.profilePic?.publicId)
        .filter(Boolean);

      // Delete users
      const result = await User.deleteMany({ _id: { $in: ids } });

      // Process Cloudinary operations in batches
      if (publicIds.length > 0) {
        const BATCH_SIZE = 100; // Cloudinary recommendation

        const deletePromises = [];
        for (let i = 0; i < publicIds.length; i += BATCH_SIZE) {
          const batch = publicIds.slice(i, i + BATCH_SIZE);
          deletePromises.push(cloudinary.api.delete_resources(batch));
        }

        await Promise.all(deletePromises);
      }

      console.timeEnd("Delete operation");

      return NextResponse.json(
        {
          deletedCount: result.deletedCount,
          message: `${result.deletedCount} users deleted successfully!`,
        },
        { status: 200 }
      );
    }

    // Single user delete
    const _id = ids[0];
    const deletedUser = await User.findOneAndDelete({ _id });

    if (!deletedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Delete profile pic if exists
    if (deletedUser.profilePic?.publicId) {
      await cloudinary.uploader.destroy(deletedUser.profilePic.publicId);
    }

    console.timeEnd("Delete operation");

    return NextResponse.json(
      { message: "User deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return apiResponse.error(error);
  }
}
