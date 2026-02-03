import RemarksClient from "./RemarksClient";
import ErrorPage from "@/components/ErrorPage";
import { fetchData, formatOptions, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

import fs from 'fs';
import path from 'path';

export default async function RemarksPage() {
  const logFile = path.join(process.cwd(), 'debug_log.txt');
  const log = (msg) => {
    try {
      fs.appendFileSync(logFile, new Date().toISOString() + ': ' + msg + '\n');
    } catch (e) { }
  };
  log("RemarksPage started");
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    let user = {};
    try {
      user = parseUser(headerStore);
    } catch (e) {
      console.error("Error parsing user:", e);
    }

    // Fetch classes for dropdown
    let classes = [];
    try {
      const classesData = await fetchData("classes", "projection=_id,name", 0);
      console.log("Classes Data:", JSON.stringify(classesData, null, 2));
      classes = formatOptions(classesData);
    } catch (e) {
      console.error("Error fetching classes:", e);
    }

    // Fetch teachers for dropdown
    let teachers = [];
    try {
      log("Fetching teachers...");
      const teachersData = await fetchData("users", "roles=Teacher&limit=1000", 0, "users");
      log(`Teachers Data Raw: ${JSON.stringify(teachersData).slice(0, 100)}...`);
      teachers = formatOptions(teachersData);
      log(`Teachers Formatted Count: ${teachers.length}`);
    } catch (e) {
      log(`Error fetching teachers: ${e.message}`);
      console.error("Error fetching teachers:", e);
    }

    return (
      <RemarksClient
        apiKey={apiKey}
        activeRole={activeRole}
        user={user}
        classes={classes}
        teachers={teachers}
      />
    );
  } catch (error) {
    console.error("Critical error in RemarksPage:", error);
    if (error.cause) console.error("Caused by:", error.cause);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 60;
