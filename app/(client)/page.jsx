import { Button } from "@/components/ui/button";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  const verifiedToken = await verifyToken(token);
  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800">
      {/* Header with subtle gradient background */}
      <header className="w-full py-4 px-6 flex justify-center items-center shadow">
        <Image
          src="/logo.svg"
          alt="Logo"
          width={200}
          height={200}
          className="mr-4"
        />
      </header>

      {/* Hero Section with improved spacing and visual hierarchy */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-gray-900">
            Sa-adiya College of{" "}
            <span className="text-emerald-700">Integrated Studies</span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-gray-600">
            A Legacy of Knowledge and Excellence: Blending Islamic values with
            modern education for tomorrow's leaders.
          </p>
          <div className="flex flex-col sm:flex-row w-40 mx-auto sm:w-auto gap-4 justify-center">
            <Link href={verifiedToken?.payload ? "/dashboard" : "/login"}>
              <Button
                size="lg"
                className="w-full py-6 sm:w-40 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Login
              </Button>
            </Link>
            <Link href="/">
              <Button
                size="lg"
                variant="outline"
                className="w-full py-6 sm:w-40 border-2 border-emerald-700 text-emerald-700 bg-transparent hover:bg-emerald-50 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section with cards and subtle animations */}
      <section className="py-16 px-6 md:px-12">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose Sa-adiya
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-emerald-500">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-700">
              Integrated Curriculum
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Experience a thoughtfully designed program combining timeless
              Islamic teachings with modern academic excellence, preparing
              students for contemporary challenges.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-emerald-500">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-700">
              Qualified Faculty
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Learn from our experienced educators who are dedicated to
              nurturing both intellectual rigor and spiritual growth in a
              supportive learning environment.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-emerald-500">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-700">
              Vibrant Campus
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Immerse yourself in our serene campus environment designed to
              foster holistic development through state-of-the-art facilities
              and spaces for reflection.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-emerald-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Begin Your Journey With Us
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Discover how Sa-adiya College can help you achieve academic
            excellence while nurturing your spiritual growth.
          </p>
          <Link href="/">
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
            <h3 className="text-lg font-semibold mb-4">Sa-adiya College</h3>
            <p className="text-sm opacity-80">
              Providing excellence in integrated education since 1995.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition">
                  Programs
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition">
                  Faculty
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>123 Education Avenue</li>
              <li>Email: info@saadiya.edu</li>
              <li>Phone: (123) 456-7890</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-white transition">
                Facebook
              </Link>
              <Link href="#" className="hover:text-white transition">
                Twitter
              </Link>
              <Link href="#" className="hover:text-white transition">
                Instagram
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-700 text-sm text-center opacity-70">
          © 2025 Sa-adiya College of Integrated Studies. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
