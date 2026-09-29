import Link from "next/link";
import { Instagram, MessageCircle, Youtube } from "lucide-react";

export default function Footer({ settings, institutionName, year, variant }) {
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

  const rawYear =
    year ||
    settings?.festival?.festivalInfo?.year ||
    settings?.festival?.festival_year ||
    settings?.festival?.year ||
    settings?.activeYear ||
    "2026";
  const festivalYear = rawYear.toString().trim().split(" ")[0] || "2026";

  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-6 mt-auto">
      {/* Desktop: 4-col grid. Mobile: Institution + Contact full-width, then Quick Links + Connect side by side */}
      <div className="max-w-6xl mx-auto">
        {/* Top row: Institution & Contact — full width on mobile, 2 of 4 cols on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 md:mb-0">
          {/* Institution */}
          <div>
            {settings?.festival?.festivalThemeImage?.url ? (
              <img
                src={settings.festival.festivalThemeImage.url}
                alt="Festival Theme"
                className="h-auto w-48 md:w-56 object-contain m-0 pt-4 pb-4 block drop-shadow-md"
              />
            ) : (
              <h3 className="text-lg font-semibold mb-4">{institutionName || "Sadiya Dawa College"}</h3>
            )}
            <p className="text-sm opacity-80 leading-relaxed pr-4">
              <span className="font-semibold text-white/90">
                {settings?.festival?.festival_name || "Esperanza"} {festivalYear || settings?.festival?.festival_year || "2026"}, 11th Edition.
              </span>
              <br />
              {festivalYear} September 17-20
            </p>
          </div>

          {/* Contact */}
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

          {/* Quick Links + Connect: side-by-side on mobile (span 2 cols), each in their own desktop col */}
          <div className="grid grid-cols-2 md:contents gap-8">
            {/* Quick Links */}
            <nav aria-label="Footer navigation">
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                {variant === "festival" ? (
                  <>
                    <li>
                      <Link href={`/results/${festivalYear}`} className="hover:text-white transition">
                        Results
                      </Link>
                    </li>
                    <li>
                      <Link href={`/team-points/${festivalYear}`} className="hover:text-white transition">
                        Team Points
                      </Link>
                    </li>
                    <li>
                      <Link href={`/schedule/${festivalYear}`} className="hover:text-white transition">
                        Schedule
                      </Link>
                    </li>
                    <li>
                      <Link href={`/gallery/${festivalYear}`} className="hover:text-white transition">
                        Gallery
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <a href="https://www.sa-adiya.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                        Sa-adiya
                      </a>
                    </li>
                    <li>
                      <a href="https://www.scofist.com/updates" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                        Updates
                      </a>
                    </li>
                    <li>
                      <a href="https://www.scofist.com/articles" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                        Articles
                      </a>
                    </li>
                    <li>
                      <a href="https://www.scofist.com/gallery" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                        Gallery
                      </a>
                    </li>
                  </>
                )}
              </ul>
            </nav>

            {/* Connect */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <nav className="flex flex-col gap-3">
                <a
                  href={ensureAbsoluteUrl(settings?.institution?.contact?.whatsappChannel) || "https://whatsapp.com/channel/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition group cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 text-gray-300 group-hover:text-white" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={ensureAbsoluteUrl(settings?.institution?.contact?.youtube) || "https://youtube.com/jawad_thuruthi"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition group cursor-pointer"
                >
                  <Youtube className="w-5 h-5 text-gray-300 group-hover:text-white" />
                  <span>YouTube</span>
                </a>
                <a
                  href={ensureAbsoluteUrl(settings?.institution?.contact?.instagram) || "https://instagram.com/jawad_thuruthi"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition group cursor-pointer"
                >
                  <Instagram className="w-5 h-5 text-gray-300 group-hover:text-white" />
                  <span>Instagram</span>
                </a>
              </nav>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-700 text-sm text-center opacity-70">
        © {festivalYear || settings?.festival?.festival_year || "2026"} {institutionName || "Sa-adiya College of Integrated Studies"}. All rights reserved.
      </div>
    </footer>
  );
}
