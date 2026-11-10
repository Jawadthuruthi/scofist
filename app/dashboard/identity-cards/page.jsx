import ErrorPage from "@/components/ErrorPage";
import IdentityCards from "@/components/IdentityCards";
import { fetchData, sortTeachers, sortClasses } from "@/lib/utils";
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

const identityCardsPage = async () => {
  try {
    const headersList = await headers();
    const cookiesStore = await cookies();
    const userHeader = headersList.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;
    const activeRole = cookiesStore.get("active-role")?.value || headersList.get("x-active-role") || (user?.roles?.[0]);

    const isStudent = activeRole === "Student";
    const studentQuery = isStudent && user?._id
      ? `_id=${user._id}`
      : "roles=Student&status=Active";

    let [studentsData, settings, classes, teachers] = await Promise.all([
      fetchData("users", studentQuery),
      fetchData("settings"),
      fetchData("classes", "status=Active&projection=_id,name,status"),
      fetchData("users", "roles=Teacher"),
    ]);

    let students = Array.isArray(studentsData) ? studentsData : (studentsData?.users || []);

    if (isStudent && user?._id && !students.some((s) => String(s._id) === String(user._id))) {
      const singleData = await fetchData("users", `_id=${user._id}`).catch(() => null);
      const studentObj = Array.isArray(singleData) ? singleData[0] : (singleData?.users?.[0] || singleData);
      if (studentObj && studentObj._id) {
        students = [studentObj];
      }
    }

    if (students && students.length > 0) {
      students = [...students].sort((a, b) => {
        const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
        const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });
    }

    if (classes && classes.length > 0) {
      classes = [...classes]
        .filter((c) => c?.status !== "Closed")
        .sort((a, b) => {
        const classCompare = sortClasses(a, b);
        if (classCompare !== 0) return classCompare;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
    }

    return (
      <IdentityCards
        apiKey={process.env.API_KEY}
        students={students}
        settings={settings}
        institution={settings.institution}
        idCardBackgroundImageUrl={settings.idCard?.backgroundImage?.url}
        idCardSealImageUrl={settings.idCard?.sealImage?.url}
        classes={classes}
        teachers={sortTeachers(teachers)}
        userRole={activeRole}
        allRoles={user?.roles || []}
        userId={user?._id}
      />
    );
  } catch (error) {
    console.error("Error loading identity card:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default identityCardsPage;
