import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";
import { headers } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { parseUser } from "@/lib/utils";

export default async function Layout({ children }) {
  const headerStore = await headers();
  const user = parseUser(headerStore);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider defaultOpen={false}>
        <div className="flex w-[100vw] ">
          <AppSidebar roles={user.roles} />
          <Topbar user={user} />
          <main className="flex-1 max-w-full p-4 lg:p-6 mt-14">{children}</main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
