import { cookies } from "next/headers";

const Dashboard = async () => {
  const cookieStore = await cookies();
  const activeRole = cookieStore.get("active-role")?.value;

  return <div>{activeRole}</div>;
};

export default Dashboard;

export const revalidate = 30;
