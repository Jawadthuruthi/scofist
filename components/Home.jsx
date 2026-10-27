import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AuthButtons from "@/components/AuthButtons";
import { Instagram, Facebook, Youtube } from "lucide-react";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
// This is a SERVER COMPONENT by default - perfect for SEO
export default function Home({ settings }) {
  const ensureAbsoluteUrl = (url) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:")
    ) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const institutionLogo = settings?.institution?.logo?.url;
  const institutionName = settings?.institution?.name;
  const institutionTagline = settings?.institution?.tagline;
  const orgLogo = settings?.org?.logo?.url;
  const orgName = settings?.org?.name;
  const backgroundImage = settings?.institution?.institutionPhoto?.url;

  return (
    <main className="relative flex flex-col min-h-screen text-gray-800 transition-all duration-1000 ease-in-out bg-black">
      {backgroundImage && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      {backgroundImage && (
        <div className="fixed inset-0 z-0 bg-black/50 transition-opacity duration-1000" />
      )}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header - Server Rendered */}
        <PublicHeader 
          centerLogo={institutionLogo} 
          centered={true}
        />

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-4 md:py-24">
          <div className="max-w-4xl mx-auto text-center p-8">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black mb-6 leading-tight text-white drop-shadow-md">
              {institutionName || (
                <>
                  Sa-adiya College of{" "}
                  <span className="text-emerald-400">Integrated Studies</span>
                </>
              )}
            </h1>
            <p className="text-xl max-w-2xl mx-auto mb-36 md:mb-10 leading-relaxed text-gray-200 font-medium drop-shadow-md">
              A Legacy of Knowledge and Excellence: Blending Islamic values with
              modern education for tomorrow's leaders.
            </p>

            {/* Client component only for auth-aware buttons */}
            <AuthButtons />

            {/* Vision and Mission Cards */}
            <div className="mt-16 md:mt-24 grid md:grid-cols-2 gap-6 text-left">
              <div className="p-6 md:p-8 rounded-2xl bg-white/10 border-l-4 border-emerald-400 hover:bg-white/20 hover:scale-105 backdrop-blur-sm transition-all duration-300">
                <h3 className="text-2xl font-bold text-emerald-400 mb-4 drop-shadow-md">Our Vision</h3>
                <p className="text-gray-200 leading-relaxed drop-shadow-md">
                  To be a premier institution of holistic learning that seamlessly integrates timeless Islamic teachings with modern academic excellence, producing well-rounded leaders who are spiritually grounded, intellectually equipped, and dedicated to the betterment of society.
                </p>
              </div>
              <div className="p-6 md:p-8 rounded-2xl bg-white/10 border-l-4 border-emerald-400 hover:bg-white/20 hover:scale-105 backdrop-blur-sm transition-all duration-300">
                <h3 className="text-2xl font-bold text-emerald-400 mb-4 drop-shadow-md">Our Mission</h3>
                <ul className="text-gray-200 leading-relaxed space-y-3 drop-shadow-md list-disc list-outside ml-4 marker:text-emerald-400">
                  <li>To provide a comprehensive educational curriculum that bridges secular academic disciplines with deep, traditional Islamic studies.</li>
                  <li>To empower the next generation with the intellectual tools and spiritual insight needed to serve as positive community leaders and ambassadors of religious propagation.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

      {/* Features Section */}
      <section
        className="pt-0 pb-16 md:py-16 px-6 md:px-12"
        aria-labelledby="features-heading"
      >
        <h2
          id="features-heading"
          className="text-3xl font-bold text-center mb-12 text-white drop-shadow-md"
        >
          Why Choose Sa-adiya College
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <article className="p-8 rounded-lg transition-all duration-300 border-t-4 border-emerald-400 bg-white/10 hover:bg-white/20 hover:scale-105">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-400 drop-shadow-md">
              Integrated Curriculum
            </h3>
            <p className="text-gray-200 leading-relaxed drop-shadow-md">
              Experience a thoughtfully designed program combining timeless
              Islamic teachings with modern academic excellence, preparing
              students for contemporary challenges.
            </p>
          </article>
          <article className="p-8 rounded-lg transition-all duration-300 border-t-4 border-emerald-400 bg-white/10 hover:bg-white/20 hover:scale-105">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-400 drop-shadow-md">
              Qualified Faculty
            </h3>
            <p className="text-gray-200 leading-relaxed drop-shadow-md">
              Learn from our experienced educators who are dedicated to
              nurturing both intellectual rigor and spiritual growth in a
              supportive learning environment.
            </p>
          </article>
          <article className="p-8 rounded-lg transition-all duration-300 border-t-4 border-emerald-400 bg-white/10 hover:bg-white/20 hover:scale-105">
            <h3 className="text-2xl font-semibold mb-4 text-emerald-400 drop-shadow-md">
              Vibrant Campus
            </h3>
            <p className="text-gray-200 leading-relaxed drop-shadow-md">
              Immerse yourself in our serene campus environment designed to
              foster holistic development through state-of-the-art facilities
              and spaces for reflection.
            </p>
          </article>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-16 px-4 text-white"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="cta-heading" className="text-3xl font-bold mb-6 drop-shadow-md">
            Begin Your Journey With Us
          </h2>
          <p className="text-lg mb-8 opacity-90 drop-shadow-md">
            Discover how Sa-adiya College can help you achieve academic
            excellence while nurturing your spiritual growth.
          </p>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter
        settings={settings}
        institutionName={institutionName}
        institutionTagline={institutionTagline}
        showTagline={true}
      />
      </div>
    </main>
  );
}
