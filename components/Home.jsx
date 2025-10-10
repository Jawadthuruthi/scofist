import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AuthButtons from "@/components/AuthButtons";

// This is a SERVER COMPONENT by default - perfect for SEO
export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800">
      {/* Header - Server Rendered */}
      <header className="w-full py-4 px-6 flex justify-center items-center shadow">
        <Image
          src="/logo.svg"
          alt="Sadiya Dawa College Logo - Islamic College of Integrated Studies"
          width={200}
          height={200}
          className="mr-4"
          priority
        />
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-gray-900">
            Sa-adiya College of{" "}
            <span className="text-emerald-700">Integrated Studies</span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-gray-600">
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
          <Link href="/virtual-tour">
            <Button
              size="lg"
              className="px-8 py-6 bg-white text-emerald-700 hover:bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Take a Virtual Tour
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Sadiya Dawa College</h3>
            <p className="text-sm opacity-80">
              Providing excellence in integrated Islamic education since 2009.
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
                <Link href="/faculty" className="hover:text-white transition">
                  Faculty
                </Link>
              </li>
            </ul>
          </nav>
          <address className="not-italic">
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>Kasaragod, Kerala, India</li>
              <li>
                Email:{" "}
                <a
                  href="mailto:ksdjabbu@gmail.com"
                  className="hover:text-white"
                >
                  ksdjabbu@gmail.com
                </a>
              </li>
              <li>
                Phone:{" "}
                <a href="tel:+918943264498" className="hover:text-white">
                  +91-8943264498
                </a>
              </li>
            </ul>
          </address>
          <div>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <nav className="flex gap-4">
              <Link
                href="https://instagram.com/jawad_thuruthi"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                Instagram
              </Link>
            </nav>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-700 text-sm text-center opacity-70">
          © 2025 Sa-adiya College of Integrated Studies. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
