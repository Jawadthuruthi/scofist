import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({ children }) {
  const headerStore = await headers();
  const cookiesStore = await cookies();
  const user = parseUser(headerStore);
  const activeRole = cookiesStore.get("active-role")?.value;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-screen overflow-hidden min-w-full max-w-full">
          <AppSidebar roles={user?.roles} activeRole={activeRole} user={user} />
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar user={user} />
            <main className="flex-1 p-4 mt-14 overflow-auto container">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
