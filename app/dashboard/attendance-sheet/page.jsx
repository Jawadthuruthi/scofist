import AttendanceSheet from "@/components/AttendanceSheet";

const AttendanceSheetPage = () => {
  const apiKey = process.env.API_KEY;
  return <AttendanceSheet apiKey={apiKey} />;
};

export default AttendanceSheetPage;

export const revalidate = 0;
