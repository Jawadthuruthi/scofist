import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import StudentsClient from "@/components/StudentsClient.jsx";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch.js";
import Class from "@/models/Class.js";

export default async function BatchesPage() {
  try {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;

    try {
      await connectToDB();
    } catch (error) {
      console.error("Error connecting to database:", error.message);
      throw error;
    }

    const batchesData = await Batch.find({}).select("_id name").lean();
    const classesData = await Class.find({}).select("_id name").lean();

    const batches = JSON.parse(JSON.stringify(batchesData));
    const classes = JSON.parse(JSON.stringify(classesData));

    return <StudentsClient batches={batches} classes={classes} activeRole={activeRole} apiKey={process.env.API_KEY} />;
  } catch (error) {
    console.error("Error loading students:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 0;
