import { apiResponse } from "@/lib/apiResponse";
import cloudinary from "@/lib/cloudinary";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    console.time("Total request time");

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
      query["studentSpecificField.classId"] = filterParams.classId;
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

    console.time("Database query");

    // Use lean for better performance when appropriate
    const users = await User.find(query, projections)
      .populate("studentSpecificField.batchId", "name")
      .populate("studentSpecificField.classId", "name")
      .populate("studentSpecificField.admissionClassId", "name")
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });

    console.timeEnd("Database query");

    // Get total count for pagination info - use efficient counting
    console.time("Count query");
    const total = await User.countDocuments(query);
    console.timeEnd("Count query");

    console.time("Data formatting");
    // Optimize the data transformation to avoid deep cloning
    const formattedUsers = users.map((user) => {
      // Handle null/undefined safely
      const address = user.address || {};
      const teacherSpecificField = user.teacherSpecificField || {};
      const studentSpecificField = user.studentSpecificField || {};
      const islamicCourse = studentSpecificField.islamicCourse || {};
      const generalCourse = studentSpecificField.generalCourse || {};

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

        // Course information
        islamicCourseName: islamicCourse.name,
        islamicCourseUniversity: islamicCourse.university,
        islamicCourseRegisterNumber: islamicCourse.registerNumber,
        islamicCourseYear: islamicCourse.year,
        islamicCourseSemester: islamicCourse.semester,

        generalCourseName: generalCourse.name,
        generalCourseUniversity: generalCourse.university,
        generalCourseRegisterNumber: generalCourse.registerNumber,
        generalCourseYear: generalCourse.year,
        generalCourseSemester: generalCourse.semester,

        status: user.roles?.includes("Student")
          ? studentSpecificField.status
          : teacherSpecificField.status,
      };
    });
    console.timeEnd("Data formatting");

    console.timeEnd("Total request time");

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
      islamicCourseName,
      islamicUniversity,
      islamicCourseRegisterNumber,
      islamicCourseYear,
      islamicCourseSemester,
      academicCourseName,
      generalUniversity,
      generalCourseRegisterNumber,
      generalCourseYear,
      generalCourseSemester,
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
        islamicCourse: {
          name: islamicCourseName,
          university: islamicUniversity,
          registerNumber: islamicCourseRegisterNumber,
          year: islamicCourseYear,
          semester: islamicCourseSemester,
        },
        generalCourse: {
          name: academicCourseName,
          university: generalUniversity,
          registerNumber: generalCourseRegisterNumber,
          year: generalCourseYear,
          semester: generalCourseSemester,
        },
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

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();

    if (!body.ids || !body.ids.length) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      );
    }

    const ids = body.ids;
    const _id = ids[0];

    // Build the update data object
    const updateData = { $set: {} };

    // Process basic fields first
    const basicFields = [
      "name",
      "email",
      "contactNumber",
      "alternativeNumber",
      "dateOfBirth",
      "roles",
    ];

    basicFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData.$set[field] = body[field];
      }
    });

    // Handle profilePic separately
    if (body.profilePic && Object.keys(body.profilePic).length > 0) {
      updateData.$set.profilePic = body.profilePic;
    }

    // Handle address fields
    const addressFields = [
      { bodyField: "houseName", dbField: "address.houseName" },
      { bodyField: "place", dbField: "address.place" },
      { bodyField: "postOffice", dbField: "address.postOffice" },
      { bodyField: "district", dbField: "address.district" },
      { bodyField: "state", dbField: "address.state" },
      { bodyField: "pin", dbField: "address.pin" },
    ];

    addressFields.forEach(({ bodyField, dbField }) => {
      if (body[bodyField] !== undefined) {
        updateData.$set[dbField] = body[bodyField];
      }
    });

    // Handle role-specific fields
    const roles = body.roles || [];

    // Teacher specific fields
    if (roles.includes("Teacher")) {
      if (body.dateOfJoining !== undefined) {
        updateData.$set["teacherSpecificField.dateOfJoining"] =
          body.dateOfJoining;
      }
      if (body.status !== undefined) {
        updateData.$set["teacherSpecificField.status"] = body.status;
      }
    }

    // Student specific fields
    if (roles.includes("Student")) {
      const studentBasicFields = [
        {
          bodyField: "admissionClassId",
          dbField: "studentSpecificField.admissionClassId",
        },
        {
          bodyField: "admissionDate",
          dbField: "studentSpecificField.admissionDate",
        },
        { bodyField: "aadharNo", dbField: "studentSpecificField.aadharNo" },
        { bodyField: "bloodGroup", dbField: "studentSpecificField.bloodGroup" },
        {
          bodyField: "guardianName",
          dbField: "studentSpecificField.guardianName",
        },
        {
          bodyField: "guardianContactNumber",
          dbField: "studentSpecificField.guardianContactNumber",
        },
        {
          bodyField: "guardianAlternativeNumber",
          dbField: "studentSpecificField.guardianAlternativeNumber",
        },
        {
          bodyField: "relationship",
          dbField: "studentSpecificField.relationship",
        },
        {
          bodyField: "islamicQualification",
          dbField: "studentSpecificField.islamicQualification",
        },
        {
          bodyField: "academicQualification",
          dbField: "studentSpecificField.academicQualification",
        },
        { bodyField: "batchId", dbField: "studentSpecificField.batchId" },
        { bodyField: "status", dbField: "studentSpecificField.status" },
      ];

      studentBasicFields.forEach(({ bodyField, dbField }) => {
        if (body[bodyField] !== undefined) {
          updateData.$set[dbField] = body[bodyField];
        }
      });

      // Islamic course
      const islamicCourseFields = [
        {
          bodyField: "islamicCourseName",
          dbField: "studentSpecificField.islamicCourse.name",
        },
        {
          bodyField: "islamicUniversity",
          dbField: "studentSpecificField.islamicCourse.university",
        },
        {
          bodyField: "islamicCourseRegisterNumber",
          dbField: "studentSpecificField.islamicCourse.registerNumber",
        },
        {
          bodyField: "islamicCourseYear",
          dbField: "studentSpecificField.islamicCourse.year",
        },
        {
          bodyField: "islamicCourseSemester",
          dbField: "studentSpecificField.islamicCourse.semester",
        },
      ];

      islamicCourseFields.forEach(({ bodyField, dbField }) => {
        if (body[bodyField] !== undefined) {
          updateData.$set[dbField] = body[bodyField];
        }
      });

      // General course
      const generalCourseFields = [
        {
          bodyField: "academicCourseName",
          dbField: "studentSpecificField.generalCourse.name",
        },
        {
          bodyField: "generalUniversity",
          dbField: "studentSpecificField.generalCourse.university",
        },
        {
          bodyField: "generalCourseRegisterNumber",
          dbField: "studentSpecificField.generalCourse.registerNumber",
        },
        {
          bodyField: "generalCourseYear",
          dbField: "studentSpecificField.generalCourse.year",
        },
        {
          bodyField: "generalCourseSemester",
          dbField: "studentSpecificField.generalCourse.semester",
        },
      ];

      generalCourseFields.forEach(({ bodyField, dbField }) => {
        if (body[bodyField] !== undefined) {
          updateData.$set[dbField] = body[bodyField];
        }
      });

      // Status-dependent fields
      if (body.status === "Dropped Out") {
        if (body.droppedOutDate !== undefined) {
          updateData.$set["studentSpecificField.droppedOutDate"] =
            body.droppedOutDate;
        }
        if (body.droppedOutClass !== undefined) {
          updateData.$set["studentSpecificField.droppedOutClass"] =
            body.droppedOutClass;
        }
        if (body.droppedOutReason !== undefined) {
          updateData.$set["studentSpecificField.droppedOutReason"] =
            body.droppedOutReason;
        }
      } else if (body.status === "Graduated") {
        if (body.graduatedYear !== undefined) {
          updateData.$set["studentSpecificField.graduatedYear"] =
            body.graduatedYear;
        }
      }
    } else if (
      body.status !== undefined &&
      !roles.includes("Student") &&
      !roles.includes("Teacher")
    ) {
      // For non-student, non-teacher roles
      updateData.$set.status = body.status;
    }

    // Only proceed with update if there are fields to update
    if (Object.keys(updateData.$set).length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    console.time("Update operation");

    // Multiple users update
    if (ids.length > 1) {
      const result = await User.updateMany({ _id: { $in: ids } }, updateData);

      console.timeEnd("Update operation");

      return NextResponse.json(
        {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          message: `${result.modifiedCount} users updated successfully!`,
        },
        { status: 200 }
      );
    }

    // Single user update
    const updatedUser = await User.findOneAndUpdate({ _id }, updateData, {
      new: true,
    });

    console.timeEnd("Update operation");

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { updatedUser, message: "User updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return apiResponse.error(error);
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
