import apiResponse from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import ApplicationForm from "@/models/ApplicationForm";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectToDB();
    
    // Fetch unique admission classes from all applications
    const distinctClasses = await ApplicationForm.distinct("admissionClass");
    
    // Combine with default values and filter out empty ones
    const defaults = ["+1", "Degree"];
    const allUniqueClasses = Array.from(new Set([...defaults, ...distinctClasses]))
      .filter(Boolean)
      .sort();

    return NextResponse.json(
      {
        success: true,
        classes: allUniqueClasses,
        message: "Admission classes fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
