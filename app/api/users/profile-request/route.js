import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import User from "@/models/User";

export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { userId, pendingChanges } = body;

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    await User.updateOne(
      { _id: userId },
      { 
        $set: { 
          pendingProfileUpdate: pendingChanges,
          profileUpdateStatus: "Pending",
          profileRequestDate: new Date()
        } 
      }
    );

    return NextResponse.json({ message: "Update request submitted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error submitting profile request:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (action === "approve") {
      const changes = user.pendingProfileUpdate;
      if (!changes) {
        return NextResponse.json({ message: "No pending changes found" }, { status: 400 });
      }

      // Deep merge logic or simple field update
      const updateObj = {
        profileUpdateStatus: "Verified",
        pendingProfileUpdate: null,
      };

      // Map top level fields
      const topLevelFields = ["name", "email", "contactNumber", "alternativeNumber", "dateOfBirth"];
      topLevelFields.forEach((field) => {
        if (changes[field]) updateObj[field] = changes[field];
      });

      // Map studentSpecificField
      if (changes.studentSpecificField) {
        for (const [key, value] of Object.entries(changes.studentSpecificField)) {
          updateObj[`studentSpecificField.${key}`] = value;
        }
      }

      // Map address
      if (changes.address) {
        for (const [key, value] of Object.entries(changes.address)) {
          updateObj[`address.${key}`] = value;
        }
      }

      await User.updateOne({ _id: userId }, { $set: updateObj });
      return NextResponse.json({ message: "Profile update approved and applied" });
    } else if (action === "reject") {
      await User.updateOne(
        { _id: userId },
        { 
          $set: { 
            pendingProfileUpdate: null,
            profileUpdateStatus: "None"
          } 
        }
      );
      return NextResponse.json({ message: "Profile update request rejected" });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing profile request:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
