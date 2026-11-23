import ErrorPage from "@/components/ErrorPage";
import MyPeriods from "@/components/MyPeriods";
import { parseUser } from "@/lib/utils";
import { headers } from "next/headers";

import connectToDB from "@/lib/db";
import User from "@/models/User";
import Settings from "@/models/Settings";

const MyPeriodsPage = async () => {
  try {
    const apiKey = process.env.API_KEY;

    const headerStore = await headers();
    const userPayload = parseUser(headerStore);

    await connectToDB();
    const [user, settingsDoc] = await Promise.all([
      User.findById(userPayload?._id).select("teacherSpecificField.status").lean(),
      Settings.findOne({}).lean(),
    ]);
    const isPrincipal = user?.teacherSpecificField?.status === "Principal";
    const initialSettings = settingsDoc ? JSON.parse(JSON.stringify(settingsDoc)) : null;

    return (
      <MyPeriods
        apiKey={apiKey}
        teacherId={userPayload?._id}
        isPrincipal={isPrincipal}
        initialSettings={initialSettings}
      />
    );
  } catch (error) {
    console.error("Error :", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default MyPeriodsPage;

export const revalidate = 0;
