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
        projections[field] = 1;
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams?._id;
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
      query.status = filterParams.status;
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

    // Execute query with pagination
    const users = await User.find(query, projections)
      .populate("studentSpecificField.batchId", "name")
      .populate("studentSpecificField.classId", "name")
      .populate("studentSpecificField.admissionClassId", "name")
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });

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
        batchId: user.studentSpecificField.batchId?._id,
        batchName: user.studentSpecificField.batchId?.name,
        classId: user.studentSpecificField.classId?._id,
        className: user.studentSpecificField.classId?.name,
        admissionClassId: user.studentSpecificField.admissionClassId?._id,
        admissionClassName: user.studentSpecificField.admissionClassId?.name,
        islamicCourseName: user.studentSpecificField?.islamicCourse?.name,
        islamicCourseUniversity:
          user.studentSpecificField?.islamicCourse?.university,
        islamicCourseRegisterNumber:
          user.studentSpecificField?.islamicCourse?.registerNumber,
        islamicCourseYear: user.studentSpecificField?.islamicCourse?.year,
        islamicCourseSemester:
          user.studentSpecificField?.islamicCourse?.semester,
        generalCourseName: user.studentSpecificField?.generalCourse?.name,
        generalCourseUniversity:
          user.studentSpecificField?.generalCourse?.university,
        generalCourseRegisterNumber:
          user.studentSpecificField?.generalCourse?.registerNumber,
        generalCourseYear: user.studentSpecificField?.generalCourse?.year,
        generalCourseSemester:
          user.studentSpecificField?.generalCourse?.semester,
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
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

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
      guardianContactNumber,
      guardianAlternativeNumber,
      relationship,
      islamicQualification,
      academicQualification,
      droppedOutDate,
      droppedOutClass,
      droppedOutReason,
      graduatedYear,
      classId,
      batchId,
      islamicCourseName,
      islamicUniversity, // Field name in request
      islamicCourseRegisterNumber,
      islamicCourseYear,
      islamicCourseSemester,
      academicCourseName, // Field name in request
      generalUniversity, // Field name in request
      generalCourseRegisterNumber,
      generalCourseYear,
      generalCourseSemester,
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
      teacherSpecificField: roles.includes("Teacher") && {
        dateOfJoining,
        status,
      },
      studentSpecificField: roles.includes("Student") && {
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
        classId,
        batchId,
        islamicCourse: {
          name: islamicCourseName,
          university: islamicUniversity, // Map from request
          registerNumber: islamicCourseRegisterNumber,
          year: islamicCourseYear,
          semester: islamicCourseSemester,
        },
        generalCourse: {
          name: academicCourseName, // Map from request
          university: generalUniversity, // Map from request
          registerNumber: generalCourseRegisterNumber,
          year: generalCourseYear,
          semester: generalCourseSemester,
        },
        status,
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
      { newUser, message: "User created successfully!" },
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
      guardianContactNumber,
      guardianAlternativeNumber,
      relationship,
      islamicQualification,
      academicQualification,
      droppedOutDate,
      droppedOutClass,
      droppedOutReason,
      graduatedYear,
      classId,
      batchId,
      // Mapping fields from request body
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

    const _id = ids[0];

    // Create an update object with only provided fields
    const updateData = { $set: {} };

    // Basic user fields
    if (name !== undefined) updateData.$set.name = name;
    if (email !== undefined) updateData.$set.email = email;
    if (profilePic && Object.keys(profilePic).length > 0)
      updateData.$set.profilePic = profilePic;
    if (roles !== undefined) updateData.$set.roles = roles;
    if (contactNumber !== undefined)
      updateData.$set.contactNumber = contactNumber;
    if (alternativeNumber !== undefined)
      updateData.$set.alternativeNumber = alternativeNumber;
    if (dateOfBirth !== undefined) updateData.$set.dateOfBirth = dateOfBirth;

    // Address fields
    if (houseName !== undefined)
      updateData.$set["address.houseName"] = houseName;
    if (place !== undefined) updateData.$set["address.place"] = place;
    if (postOffice !== undefined)
      updateData.$set["address.postOffice"] = postOffice;
    if (district !== undefined) updateData.$set["address.district"] = district;
    if (state !== undefined) updateData.$set["address.state"] = state;
    if (pin !== undefined) updateData.$set["address.pin"] = pin;

    // Teacher specific fields
    if (roles && roles.includes("Teacher")) {
      if (dateOfJoining !== undefined)
        updateData.$set["teacherSpecificField.dateOfJoining"] = dateOfJoining;
      if (status !== undefined)
        updateData.$set["teacherSpecificField.status"] = status;
    }

    // Student specific fields
    if (roles && roles.includes("Student")) {
      if (admissionClassId !== undefined)
        updateData.$set["studentSpecificField.admissionClassId"] =
          admissionClassId;
      if (admissionDate !== undefined)
        updateData.$set["studentSpecificField.admissionDate"] = admissionDate;
      if (aadharNo !== undefined)
        updateData.$set["studentSpecificField.aadharNo"] = aadharNo;
      if (bloodGroup !== undefined)
        updateData.$set["studentSpecificField.bloodGroup"] = bloodGroup;
      if (guardianName !== undefined)
        updateData.$set["studentSpecificField.guardianName"] = guardianName;
      if (guardianContactNumber !== undefined)
        updateData.$set["studentSpecificField.guardianContactNumber"] =
          guardianContactNumber;
      if (guardianAlternativeNumber !== undefined)
        updateData.$set["studentSpecificField.guardianAlternativeNumber"] =
          guardianAlternativeNumber;
      if (relationship !== undefined)
        updateData.$set["studentSpecificField.relationship"] = relationship;
      if (islamicQualification !== undefined)
        updateData.$set["studentSpecificField.islamicQualification"] =
          islamicQualification;
      if (academicQualification !== undefined)
        updateData.$set["studentSpecificField.academicQualification"] =
          academicQualification;
      if (classId !== undefined)
        updateData.$set["studentSpecificField.classId"] = classId;
      if (batchId !== undefined)
        updateData.$set["studentSpecificField.batchId"] = batchId;
      if (status !== undefined)
        updateData.$set["studentSpecificField.status"] = status;

      // Islamic course details
      if (islamicCourseName !== undefined)
        updateData.$set["studentSpecificField.islamicCourse.name"] =
          islamicCourseName;
      if (islamicUniversity !== undefined)
        updateData.$set["studentSpecificField.islamicCourse.university"] =
          islamicUniversity;
      if (islamicCourseRegisterNumber !== undefined)
        updateData.$set["studentSpecificField.islamicCourse.registerNumber"] =
          islamicCourseRegisterNumber;
      if (islamicCourseYear !== undefined)
        updateData.$set["studentSpecificField.islamicCourse.year"] =
          islamicCourseYear;
      if (islamicCourseSemester !== undefined)
        updateData.$set["studentSpecificField.islamicCourse.semester"] =
          islamicCourseSemester;

      // General/Academic course details
      if (academicCourseName !== undefined)
        updateData.$set["studentSpecificField.generalCourse.name"] =
          academicCourseName;
      if (generalUniversity !== undefined)
        updateData.$set["studentSpecificField.generalCourse.university"] =
          generalUniversity;
      if (generalCourseRegisterNumber !== undefined)
        updateData.$set["studentSpecificField.generalCourse.registerNumber"] =
          generalCourseRegisterNumber;
      if (generalCourseYear !== undefined)
        updateData.$set["studentSpecificField.generalCourse.year"] =
          generalCourseYear;
      if (generalCourseSemester !== undefined)
        updateData.$set["studentSpecificField.generalCourse.semester"] =
          generalCourseSemester;

      // Status-dependent fields
      if (status === "Dropped Out") {
        if (droppedOutDate !== undefined)
          updateData.$set["studentSpecificField.droppedOutDate"] =
            droppedOutDate;
        if (droppedOutClass !== undefined)
          updateData.$set["studentSpecificField.droppedOutClass"] =
            droppedOutClass;
        if (droppedOutReason !== undefined)
          updateData.$set["studentSpecificField.droppedOutReason"] =
            droppedOutReason;
      }

      if (status === "Graduated") {
        if (graduatedYear !== undefined)
          updateData.$set["studentSpecificField.graduatedYear"] = graduatedYear;
      }
    } else if (status !== undefined) {
      // For non-student roles
      updateData.$set.status = status;
    }

    // Only proceed with update if there are fields to update
    if (Object.keys(updateData.$set).length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    if (ids.length > 1) {
      const updatedUsers = await User.updateMany(
        { _id: { $in: ids } },
        updateData
      );
      return NextResponse.json(
        { updatedUsers, message: "Users Updated successfully!" },
        { status: 200 }
      );
    }

    const updatedUser = await User.findOneAndUpdate({ _id }, updateData, {
      new: true,
    });

    return NextResponse.json(
      { updatedUser, message: "User Updated successfully!" },
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
      const usersToDelete = await User.find(
        { _id: { $in: ids } },
        "profilePic"
      );

      const publicIds = usersToDelete
        .map((user) => user.profilePic.publicId)
        .filter(Boolean);

      const deletedUsers = await User.deleteMany({ _id: { $in: ids } });

      if (publicIds.length > 0) {
        await cloudinary.api.delete_resources(publicIds);
      }

      return NextResponse.json(
        { deletedUsers, message: "Users deleted successfully!" },
        { status: 200 }
      );
    }

    const deletedUser = await User.findByIdAndDelete(_id);

    if (deletedUser && deletedUser.profilePic.publicId) {
      await cloudinary.uploader.destroy(deletedUser.profilePic.publicId);
    }

    return NextResponse.json(
      { deletedUser, message: "User deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
