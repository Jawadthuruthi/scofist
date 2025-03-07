import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 text-center h-16 border-y py-4 font-bold text-lg">
        SCOFIST
      </header>
      <main className="min-h-[calc(100vh-128px)] mt-16">{children}</main>
      <Toaster />
      <footer className="text-center h-16 border-y p-4 font-semibold text-xs">
        2022 SCOFIST
      </footer>
    </>
  );
}
