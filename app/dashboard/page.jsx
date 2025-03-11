import { cookies } from "next/headers";

const page = async () => {
  const cookieStore = await cookies();
  const activeRole = cookieStore.get("active-role")?.value;

  return <div>{activeRole}</div>;
};

export default page;
