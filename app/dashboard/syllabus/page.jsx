import { headers } from "next/headers";
import Syllabus from "@/components/Syllabus";
import connectToDB from "@/lib/db";
import SyllabusModel from "@/models/Syllabus.js";

export default async function SyllabusPage() {
  const headersList = await headers();
  const activeRole = headersList.get("active-role");
  const apiKey = process.env.API_KEY;

  let syllabuses = [];
  try {
    await connectToDB();
    const data = await SyllabusModel.find({}).sort({ createdAt: -1 }).lean();
    syllabuses = JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("Failed to fetch syllabus data:", error);
    // Handle the error appropriately, maybe return an error message to the user
  }

  return (
    <Syllabus
      initialSyllabus={syllabuses}
      apiKey={apiKey}
      activeRole={activeRole}
    />
  );
}
