import ErrorPage from "@/components/ErrorPage";
import MyPeriods from "@/components/MyPeriods";
import { parseUser } from "@/lib/utils";
import { headers } from "next/headers";

import connectToDB from "@/lib/db";
import User from "@/models/User";

const MyPeriodsPage = async () => {
  try {
    const apiKey = process.env.API_KEY;

    const headerStore = await headers();
    const userPayload = parseUser(headerStore);

    await connectToDB();
    const user = await User.findById(userPayload?._id).lean();
    const isPrincipal = user?.teacherSpecificField?.status === "Principal";

    return <MyPeriods apiKey={apiKey} teacherId={userPayload?._id} isPrincipal={isPrincipal} />;
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
