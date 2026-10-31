import FacultyProfileCard from "@/components/FacultyProfileCard";
import Header from "@/components/Header";
import ErrorPage from "@/components/ErrorPage";
import { fetchData, sortTeachers } from "@/lib/utils";

export default async function FacultyPage() {
  try {
    const teachers = await fetchData(
      "users",
      "projection=_id,name,email,profilePic,contactNumber,dateOfBirth,address,place,teacherSpecificField.status&roles=Teacher&status=Active,Principal,Guest"
    );

    const classes = await fetchData("classes");

    // Sort teachers by date of birth (age seniority) - oldest first
    const sortedTeachers = sortTeachers(teachers);

    return (
      <div className="flex flex-col space-y-6">
        <Header
          title="FACULTY PROFILES"
          subTitle="View active teaching staff"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTeachers?.map((teacher) => {
            let assignedClass = classes.find((c) => (c.teacherId?._id || c.teacherId) === teacher._id)?.name || "No Class Assigned";
            if (teacher.teacherStatus === "Principal" || teacher.teacherStatus === "Guest") {
              assignedClass = teacher.teacherStatus;
            }
            return (
              <FacultyProfileCard
                key={teacher._id}
                faculty={teacher}
                assignedClass={assignedClass}
              />
            );
          })}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading faculty:", error.message);
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
