import MobileBottomNav from "@/components/MobileBottomNav";

export default async function Layout({ children }) {
  return (
    <>
      <main className="pb-20 lg:pb-0">{children}</main>
      <MobileBottomNav />
    </>
  );
}
