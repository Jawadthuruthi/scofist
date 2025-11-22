import { cookies, headers } from "next/headers";
import Syllabus from "@/components/Syllabus";
import { fetchData } from "@/lib/utils";

export default async function SyllabusPage() {
  const nextCookies = await cookies();
  const headersList = await headers();
  const activeRole = headersList.get("active-role");
  const nextAuthSessionToken = nextCookies.get("auth-token");
  const apiKey = process.env.API_KEY;

  const syllabuses = await fetchData(
    "syllabus",
    `auth-token=${nextAuthSessionToken?.value}`
  );

  return (
    <Syllabus
      initialSyllabus={syllabuses?.syllabuses}
      apiKey={apiKey}
      activeRole={activeRole}
    />
  );
}
