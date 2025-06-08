import LiteraryAttendance from "@/components/LiteraryAttendance";
import { fetchData } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "users",
    searchParams: "projection=_id,name,profilePic&status=Active&roles=Student",
  },
  {
    pathname: "classes",
  },
];

const apiKey = process.env.API_KEY;
const literaryAttendancePage = async () => {
  const [students, classes] = await Promise.all(
    API_ENDPOINTS.map((endpoint) =>
      fetchData(endpoint.pathname, endpoint.searchParams)
    )
  );
  return (
    <LiteraryAttendance students={students} classes={classes} apiKey={apiKey} />
  );
};

export default literaryAttendancePage;
export const revalidate = 60;
