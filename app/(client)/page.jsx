import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-screen">
      <h1 className="text-4xl font-bold">Welcome to Our College</h1>
      <p className="text-lg mt-4">Building a better future with education</p>
      <Link href="/login">
        <Button className="mt-6">Sign in</Button>
      </Link>
    </div>
  );
}
