import { apiResponse } from "@/lib/apiResponse";
import cloudinary from "@/lib/cloudinary";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import Class from "@/models/Class";
import "@/models/StudentCoupon"; // Ensure schema is registered
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(req) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam && !isNaN(parseInt(limitParam)) ? parseInt(limitParam) : 1000;

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
      // Always include classId to ensure frontend dropdown dependency filters work
      // only if the parent object is not already projected to avoid path collision
      if (!projections["studentSpecificField"]) {
        projections["studentSpecificField.classId"] = 1;
      }
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
    if (filterParams.attendanceClassId) {
      const attClassId = filterParams.attendanceClassId;
      query.$or = [
        { "studentSpecificField.classId": attClassId },
        { "studentSpecificField.subjectTypeAssignments": { $in: [`${attClassId}:CORE`, `${attClassId}:MAJOR`] } }
      ];
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
        query["studentSpecificField.status"] = {
          $in: filterParams.status.split(",").map((s) => s.trim()),
        };
      } else if (filterParams.roles && filterParams.roles.includes("Teacher")) {
        query["teacherSpecificField.status"] = {
          $in: filterParams.status.split(",").map((s) => s.trim()),
        };
      } else {
        query.status = {
          $in: filterParams.status.split(",").map((s) => s.trim()),
        };
      }
    }

    if (filterParams.profileUpdateStatus) {
      query.profileUpdateStatus = {
        $in: filterParams.profileUpdateStatus.split(",").map((s) => s.trim()),
      };
    }

    if (filterParams.isVerified) {
      const isVerified = filterParams.isVerified === "true";
      query["studentSpecificField.isVerified"] = isVerified ? true : { $ne: true };
    }

    if (filterParams.droppedOutReason) {
      query["studentSpecificField.droppedOutReason"] = {
        $regex: filterParams.droppedOutReason,
        $options: "i",
      };
    }

    // Handle global search parameter
    const globalSearch = url.searchParams.get("global");
    if (globalSearch) {
      // Create an $or query to search across multiple fields
      const searchFields = [
        "_id",
        "name",
        "email",
        "contactNumber",
        "address.houseName",
        "address.place",
        "address.district",
        "address.state",
        "studentSpecificField.guardianName",
        "studentSpecificField.aadharNo",
        "studentSpecificField.sslcRegisterNumber",
        "studentSpecificField.admissionNumber",
        "studentSpecificField.bloodGroup",
        "studentSpecificField.islamicQualification",
        "studentSpecificField.academicQualification",
        "studentSpecificField.droppedOutReason",
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

    // Handle lookup search parameter (more specific than global)
    const lookupSearch = url.searchParams.get("lookup");
    if (lookupSearch) {
      const lookupFields = [
        "_id",
        "name",
        "studentSpecificField.admissionNumber",
      ];
      query.$and = [
        ...(query.$and || []),
        {
          $or: lookupFields.map((field) => ({
            [field]: { $regex: lookupSearch, $options: "i" },
          })),
        },
      ];
    }

    // Determine sort direction (default to descending, but ascending for students)
    const sortParam = url.searchParams.get("sort");
    let sortDirection = (filterParams.roles && filterParams.roles.includes("Student")) ? 1 : -1;
    if (sortParam === "asc") {
      sortDirection = 1;
    } else if (sortParam === "desc") {
      sortDirection = -1;
    }

    let sortConfig = { _id: sortDirection };
    if (filterParams.roles && filterParams.roles.includes("Student")) {
      sortConfig = { "studentSpecificField.admissionNumber": sortDirection, _id: sortDirection };
    }

    // Use lean for better performance when appropriate
    let usersQuery = User.find(query, projections)
      .populate("studentSpecificField.batchId")
      .populate("studentSpecificField.classId")
      .populate("studentSpecificField.admissionClassId", "name")
      .skip(page * limit)
      .limit(limit)
      .sort(sortConfig)
      .collation({ locale: "en_US", numericOrdering: true });

    if (url.searchParams.get("populate") === "funds") {
      usersQuery = usersQuery
        .populate("funds")
        .populate("coupons")
        .populate({
          path: "rentals",
          match: { receivedDate: null },
          select: "bookId",
          populate: { path: "bookId", select: "id name prefix number" } // Populate correct book fields
        });
    }

    const users = await usersQuery;

    // Get total count for pagination info - use efficient counting
    const total = await User.countDocuments(query);

    // Optimize the data transformation to avoid deep cloning
    const formattedUsers = users.map((u) => {
      const user = u.toObject({ virtuals: true });
      const studentSpecificField = user.studentSpecificField || {};
      // Handle null/undefined safely
      const address = user.address || {};
      const teacherSpecificField = user.teacherSpecificField || {};

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
        profileUpdateStatus: user.profileUpdateStatus,
        pendingProfileUpdate: user.pendingProfileUpdate,
        profileRequestDate: user.profileRequestDate,

        // Address fields
        houseName: address.houseName,
        place: address.place,
        postOffice: address.postOffice,
        district: address.district,
        state: address.state,
        pin: address.pin,
        locationPoint: address.locationPoint,

        // Keep address object as well with formatted postOffice
        address: {
          ...address,
          postOffice: address.postOffice || null,
          locationPoint: address.locationPoint,
        },

        // Teacher specific fields
        dateOfJoining: teacherSpecificField.dateOfJoining,
        teacherStatus: teacherSpecificField.status,

        // Student specific fields
        admissionClassId: studentSpecificField.admissionClassId?._id,
        admissionClassName: studentSpecificField.admissionClassId?.name,
        admissionDate: studentSpecificField.admissionDate,
        aadharNo: studentSpecificField.aadharNo,
        sslcRegisterNumber: studentSpecificField.sslcRegisterNumber,
        bloodGroup: studentSpecificField.bloodGroup,
        guardianName: studentSpecificField.guardianName,
        guardianContactNumber: studentSpecificField.guardianContactNumber,
        guardianAlternativeNumber:
          studentSpecificField.guardianAlternativeNumber,
        relationship: studentSpecificField.relationship,
        studentStatus: studentSpecificField.status,
        islamicQualification: studentSpecificField.islamicQualification,
        academicQualification: studentSpecificField.academicQualification,
        islamicCourses: studentSpecificField.islamicCourses || [],
        academicCourses: studentSpecificField.academicCourses || [],
        droppedOutDate: studentSpecificField.droppedOutDate,
        droppedOutClass: studentSpecificField.droppedOutClass,
        droppedOutReason: studentSpecificField.droppedOutReason,
        graduatedYear: studentSpecificField.graduatedYear,
        subjectTypeAssignments: studentSpecificField.subjectTypeAssignments || [],
        isVerified: studentSpecificField.isVerified,
        verifiedAt: studentSpecificField.verifiedAt,
        familyDetails: studentSpecificField.familyDetails || u.studentSpecificField?.familyDetails || [],
        familyOtherDetails: user.familyOtherDetails || studentSpecificField.familyOtherDetails || u.familyOtherDetails || u.studentSpecificField?.familyOtherDetails || "",

        // Class and batch references
        classId: studentSpecificField.classId?._id,
        className: studentSpecificField.classId?.name,
        batchId: studentSpecificField.batchId?._id,
        batchName: studentSpecificField.batchId?.name,
        classData: studentSpecificField.classId,
        batchData: studentSpecificField.batchId,
        stream: studentSpecificField.stream,
        status: user.roles?.includes("Student")
          ? studentSpecificField.status
          : teacherSpecificField.status,
        funds: user.funds,
        coupons: user.coupons,
        pendingRentals: user.rentals,
        studentSpecificField: user.studentSpecificField,
        teacherSpecificField: user.teacherSpecificField,
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
      locationPoint,
      status,
      admissionClassId,
      admissionDate,
      aadharNo,
      sslcRegisterNumber,
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
      familyDetails,
      familyOtherDetails,
      subjectTypeAssignments,
      stream,
    } = body;

    const formatPhoneNumber = (num) => {
      if (num && /^\d{10}$/.test(num)) return '+91 ' + num;
      return num;
    };

    // Build user object efficiently
    const userData = {
      _id,
      name,
      email,
      profilePic,
      roles,
      contactNumber: formatPhoneNumber(contactNumber),
      alternativeNumber: formatPhoneNumber(alternativeNumber),
      dateOfBirth,
      address: {
        houseName,
        place,
        postOffice,
        district,
        state,
        pin,
        locationPoint,
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
        sslcRegisterNumber,
        bloodGroup,
        guardianName,
        guardianContactNumber: formatPhoneNumber(guardianContactNumber),
        guardianAlternativeNumber: formatPhoneNumber(guardianAlternativeNumber),
        relationship,
        islamicQualification,
        academicQualification,
        status,
        batchId,
        classId,
        stream,
        subjectTypeAssignments,
        familyDetails: familyDetails?.map(m => ({
          position: m.position,
          name: m.name,
          age: m.age,
          education: m.education,
          status: m.status,
          mobileNumber: m.mobileNumber,
        })),
      };
      userData.familyOtherDetails = familyOtherDetails;

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

    revalidatePath("/dashboard/students-contacts", "layout");

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

const applyUpdatesToUser = async (user, updateFields) => {
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
      if (["dateOfBirth", "name", "roles"].includes(field)) {
        if (updateFields[field] !== "" && updateFields[field] !== null) {
          user[field] = updateFields[field];
        }
      } else {
        user[field] = updateFields[field] === "" ? undefined : updateFields[field];
      }
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
    "locationPoint",
    "postOffice",
    "district",
    "state",
    "pin",
  ];
  addressFields.forEach((field) => {
    if (updateFields[field] !== undefined) {
      user.set(`address.${field}`, updateFields[field]);
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
    const studentFields = [
      "admissionNumber",
      "admissionClassId",
      "admissionDate",
      "aadharNo",
      "sslcRegisterNumber",
      "bloodGroup",
      "guardianName",
      "guardianContactNumber",
      "guardianAlternativeNumber",
      "relationship",
      "islamicQualification",
      "academicQualification",
      "batchId",
      "classId",
      "stream",
      "subjectTypeAssignments",
      "status",
      "isVerified",
      "verifiedAt",
    ];
    
    if (!user.studentSpecificField) user.studentSpecificField = {};
    
    const oldBatchId = user.studentSpecificField?.batchId;
    const oldClassId = user.studentSpecificField?.classId;
    
    studentFields.forEach((field) => {
      if (updateFields[field] !== undefined) {
        user.set(`studentSpecificField.${field}`, updateFields[field] === "" ? undefined : updateFields[field]);
      }
    });

    // Handle course updates with append or replace support
    if (updateFields.courseAction === "append") {
      if (updateFields.islamicCourses !== undefined && Array.isArray(updateFields.islamicCourses)) {
        const existing = [...(user.studentSpecificField?.islamicCourses || [])].map((c) =>
          c.toObject ? c.toObject() : { ...c }
        );
        updateFields.islamicCourses.forEach((newCourse) => {
          const idx = existing.findIndex(
            (c) => c.courseName?.trim().toLowerCase() === newCourse.courseName?.trim().toLowerCase()
          );
          if (idx !== -1) {
            existing[idx] = { ...existing[idx], ...newCourse };
          } else {
            existing.push(newCourse);
          }
        });
        user.set("studentSpecificField.islamicCourses", existing);
      }
      if (updateFields.academicCourses !== undefined && Array.isArray(updateFields.academicCourses)) {
        const existing = [...(user.studentSpecificField?.academicCourses || [])].map((c) =>
          c.toObject ? c.toObject() : { ...c }
        );
        updateFields.academicCourses.forEach((newCourse) => {
          const idx = existing.findIndex(
            (c) => c.courseName?.trim().toLowerCase() === newCourse.courseName?.trim().toLowerCase()
          );
          if (idx !== -1) {
            existing[idx] = { ...existing[idx], ...newCourse };
          } else {
            existing.push(newCourse);
          }
        });
        user.set("studentSpecificField.academicCourses", existing);
      }
    } else {
      if (updateFields.islamicCourses !== undefined) {
        user.set("studentSpecificField.islamicCourses", updateFields.islamicCourses);
      }
      if (updateFields.academicCourses !== undefined) {
        user.set("studentSpecificField.academicCourses", updateFields.academicCourses);
      }
    }

    // Auto-persist any newly added course names to Course master collection
    const coursesToPersist = [
      ...(Array.isArray(updateFields.islamicCourses)
        ? updateFields.islamicCourses.map((c) => ({ name: c.courseName?.trim(), type: "Islamic", universityBoard: c.universityBoard?.trim() || "" }))
        : []),
      ...(Array.isArray(updateFields.academicCourses)
        ? updateFields.academicCourses.map((c) => ({ name: c.courseName?.trim(), type: "Academic", universityBoard: c.universityBoard?.trim() || "" }))
        : []),
    ].filter((c) => !!c.name);

    if (coursesToPersist.length > 0) {
      (async () => {
        try {
          const Course = (await import("@/models/Course")).default;
          for (const c of coursesToPersist) {
            await Course.updateOne(
              { name: { $regex: new RegExp(`^${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
              { $setOnInsert: { name: c.name, type: c.type, universityBoard: c.universityBoard } },
              { upsert: true }
            );
          }
        } catch (e) {
          // Ignore duplicate/concurrent write error
        }
      })();
    }

    // Update StudentsFund batchId if batchId changed
    if (updateFields.batchId !== undefined && String(oldBatchId) !== String(updateFields.batchId)) {
      try {
        const StudentsFund = (await import("@/models/StudentsFund")).default;
        const studentFunds = await StudentsFund.find({ studentId: user._id });
        for (const fund of studentFunds) {
          fund.batchId = updateFields.batchId;
          try {
            await fund.save();
          } catch (err) {
            console.log("Duplicate fund found when changing batchId, skipping update for this fund");
          }
        }
      } catch (err) {
        console.error("Error updating StudentsFund batchId:", err);
      }
    }

    // Auto-sync subjectTypeAssignments when classId changes
    if (updateFields.classId !== undefined) {
      const newClassId = updateFields.classId;
      if (newClassId && String(oldClassId) !== String(newClassId)) {
        user.set("studentSpecificField.subjectTypeAssignments", [
          `${newClassId}:CORE`,
          `${newClassId}:MAJOR`,
        ]);
      }
    }

    if (updateFields.familyDetails !== undefined) {
      user.set("studentSpecificField.familyDetails", updateFields.familyDetails);
    }
    if (updateFields.familyOtherDetails !== undefined) {
      user.familyOtherDetails = updateFields.familyOtherDetails;
    }

    if (updateFields.status === "Dropped Out") {
      ["droppedOutDate", "droppedOutClass", "droppedOutReason"].forEach(
        (field) => {
          if (updateFields[field] !== undefined) {
            user.set(`studentSpecificField.${field}`, updateFields[field]);
          }
        }
      );
    } else if (updateFields.status === "Graduated") {
      if (updateFields.graduatedYear !== undefined) {
        user.set(`studentSpecificField.graduatedYear`, updateFields.graduatedYear);
      }
    }
  }
};

export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();

    const { ids, updates, _id: _idToExclude, ...updateFields } = body;
    
    const formatPhoneNumber = (num) => {
      if (num && /^\d{10}$/.test(num)) return '+91 ' + num;
      return num;
    };

    if (updateFields.contactNumber) updateFields.contactNumber = formatPhoneNumber(updateFields.contactNumber);
    if (updateFields.alternativeNumber) updateFields.alternativeNumber = formatPhoneNumber(updateFields.alternativeNumber);
    if (updateFields.guardianContactNumber) updateFields.guardianContactNumber = formatPhoneNumber(updateFields.guardianContactNumber);
    if (updateFields.guardianAlternativeNumber) updateFields.guardianAlternativeNumber = formatPhoneNumber(updateFields.guardianAlternativeNumber);

    // Support batch updates array
    if (updates && Array.isArray(updates) && updates.length > 0) {
      const updatedUsers = [];
      for (const item of updates) {
        const { id, _id: itemId, ...itemFields } = item;
        const targetId = id || itemId;
        if (!targetId) continue;
        const user = await User.findById(targetId);
        if (!user) continue;
        await applyUpdatesToUser(user, itemFields);
        await user.save();
        updatedUsers.push(user);
      }
      revalidatePath("/dashboard/students-contacts", "layout");
      return NextResponse.json(
        { updatedUsers, updatedUser: updatedUsers[0], message: "Users updated successfully!" },
        { status: 200 }
      );
    }

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      );
    }

    if (ids.length === 1) {
      const _id = ids[0];
      const user = await User.findById(_id);
      if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }
      await applyUpdatesToUser(user, updateFields);
      await user.save();
      revalidatePath("/dashboard/students-contacts", "layout");
      return NextResponse.json(
        { updatedUser: user, updatedUsers: [user], message: "User updated successfully!" },
        { status: 200 }
      );
    } else {
      const users = await User.find({ _id: { $in: ids } });
      if (!users || users.length === 0) {
        return NextResponse.json({ message: "Users not found" }, { status: 404 });
      }
      for (const user of users) {
        await applyUpdatesToUser(user, updateFields);
        await user.save();
      }
      revalidatePath("/dashboard/students-contacts", "layout");
      return NextResponse.json(
        { updatedUsers: users, updatedUser: users[0], message: `${users.length} users updated successfully!` },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return apiResponse.conflict(`User with this ${field} already exists`, { field });
    }
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

      revalidatePath("/dashboard/students-contacts", "layout");

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

    revalidatePath("/dashboard/students-contacts", "layout");

    return NextResponse.json(
      { message: "User deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return apiResponse.error(error);
  }
}

async function syncStudentClasses() {
  try {
    const ClassModel = User.db.model("Class");
    const classes = await ClassModel.find({}).lean();

    // Build a map of batchId -> Set of valid classIds
    // (a batch can have multiple classes e.g. "Plus Two" and "Plus Two B")
    const batchToValidClassesMap = {};
    // Also keep track of the first/default classId per batch (for students with no class)
    const batchToDefaultClassMap = {};
    classes.forEach((cls) => {
      if (cls.batchId) {
        if (!batchToValidClassesMap[cls.batchId]) {
          batchToValidClassesMap[cls.batchId] = new Set();
        }
        // Only Active classes count as valid destinations
        if (cls.status !== "Closed") {
          batchToValidClassesMap[cls.batchId].add(cls._id);
          // First active class becomes the default for students with no valid class
          if (!batchToDefaultClassMap[cls.batchId]) {
            batchToDefaultClassMap[cls.batchId] = cls._id;
          }
        }
      }
    });

    const students = await User.find({ roles: "Student" }).select("_id studentSpecificField.batchId studentSpecificField.classId").lean();

    const bulkOps = [];
    students.forEach((student) => {
      const currentBatchId = student.studentSpecificField?.batchId;
      const currentClassId = student.studentSpecificField?.classId;
      const validClasses = currentBatchId ? batchToValidClassesMap[currentBatchId] : null;

      // If the student already has a valid class for their batch, do NOT reassign them.
      // Only update if they have no class or their classId is not in the valid set for their batch.
      if (validClasses && currentClassId && validClasses.has(currentClassId)) {
        // Student is already in a valid class for their batch — leave them alone
        return;
      }

      const defaultClassId = currentBatchId ? batchToDefaultClassMap[currentBatchId] : null;
      const newClassId = defaultClassId || null;

      if (currentClassId !== newClassId) {
        bulkOps.push({
          updateOne: {
            filter: { _id: student._id },
            update: { 
              $set: { 
                "studentSpecificField.classId": newClassId 
              } 
            }
          }
        });
      }
    });

    if (bulkOps.length > 0) {
      console.log(`[Sync] Updating ${bulkOps.length} student class assignments...`);
      await User.bulkWrite(bulkOps);
    }
  } catch (error) {
    console.error("Error in syncStudentClasses:", error);
  }
}
