import Home from "@/components/Home";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  const verifiedToken = await verifyToken(token);

  return <Home user={verifiedToken?.payload} />;
}

export const dynamic = "force-dynamic";
