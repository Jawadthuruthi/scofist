import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AuthButtons from "@/components/AuthButtons";
import { Instagram, Facebook, Youtube } from "lucide-react";
// This is a SERVER COMPONENT by default - perfect for SEO
export default function Home({ settings }) {
  const institutionLogo = settings?.institution?.logo?.url;
  const institutionName = settings?.institution?.name;
  const backgroundImage = settings?.institution?.institutionPhoto?.url;

  return (
    <main
      className="relative flex flex-col min-h-screen text-gray-800 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
      style={
        backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}
      }
    >
      {backgroundImage && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" />
      )}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header - Server Rendered */}
        <header className="w-full py-4 px-6 flex justify-center items-center shadow bg-white/80 backdrop-blur-md">
          <img
            src={institutionLogo || "/logo.svg"}
            alt={`${institutionName} Logo`}
            width={120}
            height={120}
            className="mr-4 object-contain h-16 w-auto drop-shadow-sm"
          />
        </header>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center p-8 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight text-gray-900 drop-shadow-sm">
              {institutionName || (
                <>
                  Sa-adiya College of{" "}
                  <span className="text-emerald-700">Integrated Studies</span>
                </>
              )}
            </h1>
            <p className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-gray-700 font-medium">
              A Legacy of Knowledge and Excellence: Blending Islamic values with
              modern education for tomorrow's leaders.
            </p>

            {/* Client component only for auth-aware buttons */}
            <AuthButtons />
          </div>
        </section>

      {/* Features Section */}
      <section
        className="py-16 px-6 md:px-12"
        aria-labelledby="features-heading"
      >
        <h2
          id="features-heading"
          className="text-3xl font-bold text-center mb-12"
        >
          Why Choose Sa-adiya College
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <article className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-emerald-500">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-700">
              Integrated Curriculum
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Experience a thoughtfully designed program combining timeless
              Islamic teachings with modern academic excellence, preparing
              students for contemporary challenges.
            </p>
          </article>
          <article className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-emerald-500">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-700">
              Qualified Faculty
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Learn from our experienced educators who are dedicated to
              nurturing both intellectual rigor and spiritual growth in a
              supportive learning environment.
            </p>
          </article>
          <article className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-emerald-500">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-700">
              Vibrant Campus
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Immerse yourself in our serene campus environment designed to
              foster holistic development through state-of-the-art facilities
              and spaces for reflection.
            </p>
          </article>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="bg-emerald-700 text-white py-16 px-4"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="cta-heading" className="text-3xl font-bold mb-6">
            Begin Your Journey With Us
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Discover how Sa-adiya College can help you achieve academic
            excellence while nurturing your spiritual growth.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">{institutionName || "Sadiya Dawa College"}</h3>
            <p className="text-sm opacity-80">
              Providing excellence in integrated Islamic education since 2006.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/programs" className="hover:text-white transition">
                  Programs
                </Link>
              </li>
              <li>
                <Link href="/dashboard/faculty" className="hover:text-white transition">
                  Faculty
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-white transition">
                  News
                </Link>
              </li>
            </ul>
          </nav>
          <address className="not-italic">
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>{settings?.institution?.address || "Kasaragod, Kerala, India"}</li>
              <li>
                Email:{" "}
                <a
                  href={`mailto:${settings?.institution?.contact?.email || "ksdjabbu@gmail.com"}`}
                  className="hover:text-white"
                >
                  {settings?.institution?.contact?.email || "ksdjabbu@gmail.com"}
                </a>
              </li>
              <li>
                Phone:{" "}
                <a href={`tel:${settings?.institution?.contact?.primaryPhone || "+918943264498"}`} className="hover:text-white">
                  {settings?.institution?.contact?.primaryPhone || "+91-8943264498"}
                </a>
              </li>
            </ul>
          </address>
          <div>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <nav className="flex flex-col gap-3">
              <Link
                href="https://facebook.com/jawad_thuruthi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition group"
              >
                <Facebook className="w-5 h-5 text-gray-300 group-hover:text-white" />
                <span>Facebook</span>
              </Link>
              <Link
                href="https://youtube.com/jawad_thuruthi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition group"
              >
                <Youtube className="w-5 h-5 text-gray-300 group-hover:text-white" />
                <span>YouTube</span>
              </Link>
              <Link
                href="https://instagram.com/jawad_thuruthi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition group"
              >
                <Instagram className="w-5 h-5 text-gray-300 group-hover:text-white" />
                <span>Instagram</span>
              </Link>
            </nav>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-700 text-sm text-center opacity-70">
          © 2025 Sa-adiya College of Integrated Studies. All rights reserved.
        </div>
      </footer>
      </div>
    </main>
  );
}
