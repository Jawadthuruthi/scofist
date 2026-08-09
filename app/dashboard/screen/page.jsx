import { cookies } from "next/headers";
import ScreenClient from "./ScreenClient";

export default async function ScreenPage() {
  const apiKey = process.env.API_KEY;
  const cookiesStore = await cookies();
  const activeRole = cookiesStore.get("active-role")?.value;

  return <ScreenClient apiKey={apiKey} activeRole={activeRole} />;
}
