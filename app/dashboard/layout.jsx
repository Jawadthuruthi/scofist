import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";
import { headers } from "next/headers";

export default async function Layout({ children }) {
  const userHeaders = await headers();
  const userHeader = userHeaders.get("x-user");
  const user = userHeader !== "undefined" ? JSON.parse(userHeader) : {};

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex">
        <AppSidebar />
        <Topbar user={user} />
        <main className="flex-1 p-4 mt-14">{children}</main>
      </div>
    </SidebarProvider>
  );
}
