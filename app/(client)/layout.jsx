import MobileBottomNav from "@/components/MobileBottomNav";
import { Suspense } from "react";

export default async function Layout({ children }) {
  return (
    <>
      <main className="pb-20 lg:pb-0">{children}</main>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </>
  );
}