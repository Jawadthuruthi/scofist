import Link from "next/link";
import { Instagram, MessageCircle, Youtube, Mail, Phone, MapPin, GraduationCap } from "lucide-react";

/**
 * PublicFooter - Dignified Collegiate Footer
 * Clean architectural columns, accurate typography, verified contact points.
 */
export default function Footer({
  settings,
  institutionName,
  institutionTagline,
  year,
  variant,
  showTagline,
}) {
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

  const name = institutionName || settings?.institution?.name || "Sa-adiya College of Integrated Studies";
  const tagline =
    institutionTagline ||
    settings?.institution?.tagline ||
    "A seat of integrated Islamic scholarship and collegiate studies in Kasaragod, Kerala.";

  const rawYear =
    year ||
    settings?.festival?.festivalInfo?.year ||
    settings?.festival?.festival_year ||
    settings?.festival?.year ||
    settings?.activeYear ||
    "2026";
  const festivalYear = rawYear.toString().trim().split(" ")[0] || "2026";

  const address = settings?.institution?.address || "Sa-adabad, Deli, P.O Kalanad, Kasaragod, Kerala 671317";
  const email = settings?.institution?.contact?.email || settings?.institution?.email || "sdcvalley13@gmail.com";
  const phone = settings?.institution?.contact?.primaryPhone || settings?.institution?.primaryPhone || "+91 89432 64498";

  const whatsapp = ensureAbsoluteUrl(settings?.institution?.contact?.whatsappChannel) || "https://whatsapp.com";
  const youtube = ensureAbsoluteUrl(settings?.institution?.contact?.youtube) || "https://youtube.com/@saadiyacollege";
  const instagram = ensureAbsoluteUrl(settings?.institution?.contact?.instagram) || "https://instagram.com/jawad_thuruthi";

  return (
    <footer className="relative bg-[#070b08] text-[#a6a095] pt-16 pb-12 px-4 sm:px-6 md:px-12 border-t border-[#1a271f] mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 pb-14 border-b border-[#1a271f]">
          {/* Column 1: Institution Brand & Charter (Span 5) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#122218] border border-[#1f3a29] flex items-center justify-center text-emerald-400">
                <GraduationCap className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#f7f5ee]">{name}</h3>
                <span className="text-xs text-[#7e857b] block">
                  Under Jamia Sa-adiya Arabia · Founded 2006
                </span>
              </div>
            </div>

            <p className="text-sm text-[#8c887f] leading-relaxed max-w-sm pt-1">
              {tagline}
            </p>
          </div>

          {/* Column 2: Navigation (Span 3) */}
          <nav className="md:col-span-3 space-y-3" aria-label="Footer Navigation">
            <h4 className="text-xs font-semibold text-[#f7f5ee] uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="#about"
                  className="text-[#a6a095] hover:text-[#f7f5ee] transition-colors"
                >
                  About the College
                </Link>
              </li>
              <li>
                <Link
                  href="#vision"
                  className="text-[#a6a095] hover:text-[#f7f5ee] transition-colors"
                >
                  Foundational Charter
                </Link>
              </li>
              <li>
                <Link
                  href="#curriculum"
                  className="text-[#a6a095] hover:text-[#f7f5ee] transition-colors"
                >
                  Dual-Track Curriculum
                </Link>
              </li>
              <li>
                <Link
                  href="/articles"
                  className="text-[#a6a095] hover:text-[#f7f5ee] transition-colors"
                >
                  Scholarly Articles
                </Link>
              </li>
              <li>
                <Link
                  href="/college-gallery"
                  className="text-[#a6a095] hover:text-[#f7f5ee] transition-colors"
                >
                  Campus Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-[#a6a095] hover:text-[#f7f5ee] transition-colors"
                >
                  Student & Faculty Portal
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 3: Contact & Campus Info (Span 4) */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-semibold text-[#f7f5ee] uppercase tracking-wider">
              Campus Office
            </h4>
            
            <address className="not-italic space-y-2.5 text-sm text-[#a6a095]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-500/80 shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-500/80 shrink-0" strokeWidth={1.5} />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-[#f7f5ee] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
                >
                  {email}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-500/80 shrink-0" strokeWidth={1.5} />
                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                  className="hover:text-[#f7f5ee] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
                >
                  {phone}
                </a>
              </div>
            </address>

            {/* Verified Channels */}
            <div className="pt-3">
              <span className="text-xs text-[#7e857b] block mb-2 font-medium">Follow</span>
              <div className="flex items-center gap-2">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#121c16] hover:bg-[#1a2e23] border border-[#23382c] flex items-center justify-center text-[#a6a095] hover:text-[#f7f5ee] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                  aria-label="Connect on WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>
                <a
                  href={youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#121c16] hover:bg-[#1a2e23] border border-[#23382c] flex items-center justify-center text-[#a6a095] hover:text-[#f7f5ee] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                  aria-label="Subscribe on YouTube"
                >
                  <Youtube className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#121c16] hover:bg-[#1a2e23] border border-[#23382c] flex items-center justify-center text-[#a6a095] hover:text-[#f7f5ee] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                  aria-label="Follow on Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Colophon with spacing fix */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6e6b64]">
          <p>
            {`© ${new Date().getFullYear()} ${name}. All rights reserved.`}
          </p>
          <p>
            Dawa & Integrated Academic Education · Kasaragod, Kerala
          </p>
        </div>
      </div>
    </footer>
  );
}


