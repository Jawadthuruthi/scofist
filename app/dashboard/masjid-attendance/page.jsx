import MasjidAttendance from "@/components/MasjidAttendance";
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
const masjidAttendancePage = async () => {
  const [students, classes] = await Promise.all(
    API_ENDPOINTS.map((endpoint) =>
      fetchData(
        endpoint.pathname,
        endpoint.searchParams,
        endpoint.revalidate,
        endpoint.key
      )
    )
  );
  return (
    <MasjidAttendance
      students={students}
      classes={classes}
      apiKey={apiKey}
    />
  );
};

export default masjidAttendancePage;
export const revalidate = 60;