import "./globals.css";
import { Poppins } from "next/font/google";
import Providers from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "Sa-adiya Da-awa College - Islamic College Of Integrated Studies",
  description:
    "Sa-adiya Da-awa College offers comprehensive Islamic and integrated studies, promoting academic excellence and spiritual growth. Explore our programs and community.",
  author: "Jawad TS",
  keywords:
    "Jamia Sa Adiya Arabia, Sa-adiya Da-awa College, Islamic College, integrated studies, Islamic education, academic excellence, spiritual growth, Islamic studies programs, higher education, Da-awa college",
  robots: "index, follow",
  openGraph: {
    title: "Sa-adiya Da-awa College - Islamic College for Integrated Studies",
    description:
      "Join Sa-adiya Da-awa College, where Islamic and academic excellence meet. Offering a range of programs designed for intellectual and spiritual development.",
    url: "https://www.scofist.com",
    type: "website",
    locale: "en_US",
    site_name: "Sa-adiya Da-awa College",
  },
  social: {
    platform: "Instagram",
    handle: "@jawad_thuruthi",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={poppins.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
