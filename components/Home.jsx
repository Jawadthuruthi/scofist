import Link from "next/link";
import AuthButtons from "@/components/AuthButtons";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
import ApplicationForm from "@/components/ApplicationForm";
import {
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  ChevronRight,
  PhoneCall,
  CheckCircle2,
  FileText,
} from "lucide-react";

/**
 * Home Component - Collegiate Editorial Identity
 * Crafted according to /frontend-design studio principles:
 * - Bespoke typography: Playfair Display for academic gravity + clean sans for body
 * - Authentic palette: Deep heritage evergreen, warm alabaster, muted sand
 * - Concrete subject matter: Detailed Islamic epistemology and university degree dual-track
 * - Quiet confidence: No single-word headline gradients, no repetitive ALL-CAPS eyebrow pills
 */
export default function Home({ settings }) {
  const institutionLogo = settings?.institution?.logo?.url;
  const institutionName = settings?.institution?.name || "Sa-adiya College of Integrated Studies";
  const institutionTagline =
    settings?.institution?.tagline ||
    "A legacy of scholarship and moral purpose: uniting classical Islamic sciences with accredited university education.";
  const backgroundImage = settings?.institution?.institutionPhoto?.url;
  const primaryPhone = settings?.institution?.contact?.primaryPhone || settings?.institution?.primaryPhone || "+91 89432 64498";

  return (
    <div className="relative min-h-screen bg-[#080c09] text-[#ded9ce] selection:bg-emerald-900/50 selection:text-emerald-100 font-sans">
      {/* Subtle atmospheric ground - quiet, not neon */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(1000px 500px at 50% -80px, rgba(20, 80, 50, 0.3), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {backgroundImage && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-10 filter blur-[2px]"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Floating Collegiate Header */}
        <PublicHeader
          centerLogo={institutionLogo}
          name={institutionName}
          centered={true}
        />

        {/* 1. Hero Section: Scholarly Dignity & Awwwards Spatial Rhythm */}
        <section
          className="pt-20 sm:pt-28 md:pt-36 pb-20 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center"
          aria-labelledby="hero-title"
        >
          {/* Institutional Affiliation Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-7 sm:mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
            <span className="text-xs font-medium tracking-normal text-[#a6ada4]">
              Jamia Sa-adiya Arabia · Kasaragod, Kerala
            </span>
          </div>

          <h1
            id="hero-title"
            className="text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-[#f7f5ee] leading-[1.12] max-w-4xl mx-auto font-['Playfair_Display',serif]"
          >
            Where Sacred Wisdom Meets Contemporary Intellect
          </h1>

          <p className="mt-6 mb-12 sm:mb-14 max-w-2xl mx-auto text-base sm:text-lg text-[#a6a095] leading-relaxed">
            {institutionTagline}
          </p>

          {/* Action Navigation: Hero Buttons */}
          <div className="mb-16 md:mb-20">
            <AuthButtons variant="hero" />
          </div>

          {/* Institutional Pedigree Strip */}
          <div className="border-t border-b border-[#1b2b20] py-4 max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm text-[#8c887f] tracking-wide">
              Two Decades of Collegiate Integration · Founded 2006 · Kasaragod Campus
            </p>
          </div>
        </section>

        {/* 2. Foundational Charter: Vision & Mission */}
        <section
          id="vision"
          className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full"
          aria-labelledby="charter-heading"
        >
          <div className="border-b border-[#1b2b20] pb-4 mb-10">
            <h2
              id="charter-heading"
              className="text-2xl sm:text-3xl font-normal text-[#f7f5ee] font-['Playfair_Display',serif]"
            >
              Foundational Charter
            </h2>
            <p className="text-sm text-[#8c887f] mt-1">
              The moral and intellectual commitment guiding Sa-adiya Dawa College.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 md:gap-14">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[#f7f5ee] flex items-center gap-2">
                <span>Institutional Vision</span>
              </h3>
              <p className="text-sm sm:text-base text-[#a6a095] leading-relaxed">
                To stand as a leading center of holistic learning where classical Islamic epistemologies harmoniously integrate with contemporary academic scholarship—nurturing graduates who are spiritually steadfast, intellectually disciplined, and dedicated to the ethical betterment of human society.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[#f7f5ee] flex items-center gap-2">
                <span>The Core Mission</span>
              </h3>
              <ul className="space-y-3 text-sm sm:text-base text-[#a6a095] leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span>
                    Deliver a rigorous dual curriculum synthesizing traditional Islamic studies with accredited university bachelor degrees.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span>
                    Cultivate articulate ambassadors of knowledge with sound research methodology, critical discernment, and civic responsibility.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. The Dual-Track Curriculum Architecture */}
        <section
          id="curriculum"
          className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full"
          aria-labelledby="curriculum-heading"
        >
          <div className="border-b border-[#1b2b20] pb-4 mb-10">
            <h2
              id="curriculum-heading"
              className="text-2xl sm:text-3xl font-normal text-[#f7f5ee] font-['Playfair_Display',serif]"
            >
              The Integrated Curriculum
            </h2>
            <p className="text-sm text-[#8c887f] mt-1">
              Concurrent theological formation and recognised collegiate degree programs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Track 1: Islamic Sciences */}
            <div className="p-7 rounded-2xl bg-[#0d1611] border border-[#1b2d22]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e3327]">
                <h3 className="text-lg font-semibold text-[#f7f5ee]">
                  Classical Islamic Sciences & Dawa
                </h3>
                <span className="text-xs text-emerald-400 font-medium">Theological Core</span>
              </div>
              <p className="text-sm text-[#a6a095] leading-relaxed mb-5">
                Comprehensive study of foundational Islamic disciplines under traditional scholarly tutelage:
              </p>
              <ul className="space-y-2 text-sm text-[#ded9ce]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Quranic Exegesis (Tafsir) & Hermeneutics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Hadith Literature & Methodology</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Islamic Jurisprudence (Fiqh & Usul al-Fiqh)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Classical Arabic Grammar & Rhetoric (Balagha)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Dawa Methodology & Comparative Religion</span>
                </li>
              </ul>
            </div>

            {/* Track 2: University Degree */}
            <div className="p-7 rounded-2xl bg-[#0d1611] border border-[#1b2d22]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e3327]">
                <h3 className="text-lg font-semibold text-[#f7f5ee]">
                  Accredited University Programs
                </h3>
                <span className="text-xs text-emerald-400 font-medium">Undergraduate Degree</span>
              </div>
              <p className="text-sm text-[#a6a095] leading-relaxed mb-5">
                Recognised university undergraduate streams pursued concurrently on campus:
              </p>
              <ul className="space-y-2 text-sm text-[#ded9ce]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Bachelor of Arts (Humanities & Social Sciences)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Bachelor of Commerce (Finance & Management)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Modern English Literature & Academic Writing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Information Technology & Computer Applications</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
                  <span>Research Methodology & Contemporary Seminars</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Supporting Campus Features */}
          <div className="grid sm:grid-cols-2 gap-6 mt-6">
            <div className="p-5 rounded-xl bg-[#0b120e] border border-[#17251c] flex items-start gap-4">
              <Users className="w-5 h-5 text-emerald-400 shrink-0 mt-1" strokeWidth={1.5} />
              <div>
                <h4 className="text-sm font-semibold text-[#f7f5ee]">Residential Mentorship</h4>
                <p className="text-xs text-[#8c887f] mt-1 leading-relaxed">
                  Scholars and faculty reside on campus, providing ongoing intellectual guidance, character cultivation, and moral oversight.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#0b120e] border border-[#17251c] flex items-start gap-4">
              <Building2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" strokeWidth={1.5} />
              <div>
                <h4 className="text-sm font-semibold text-[#f7f5ee]">Kasaragod Sanctuary</h4>
                <p className="text-xs text-[#8c887f] mt-1 leading-relaxed">
                  A serene academic setting in Deli, Kasaragod, featuring classical library archives and dedicated study cloisters.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Campus Inquiries & Publications */}
        <section
          id="about"
          className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full"
          aria-labelledby="inquiries-heading"
        >
          <div className="border-b border-[#1b2b20] pb-4 mb-10">
            <h2
              id="inquiries-heading"
              className="text-2xl sm:text-3xl font-normal text-[#f7f5ee] font-['Playfair_Display',serif]"
            >
              Academic Life & Resources
            </h2>
            <p className="text-sm text-[#8c887f] mt-1">
              Publications, photographic archives, and student portal access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/articles"
              className="group p-6 rounded-2xl bg-[#0d1611] hover:bg-[#122018] border border-[#1b2d22] hover:border-[#284433] transition-colors"
            >
              <BookOpen className="w-5 h-5 text-emerald-400 mb-4" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-[#f7f5ee] mb-1.5 group-hover:text-emerald-300 transition-colors">
                Scholarly Articles
              </h3>
              <p className="text-xs sm:text-sm text-[#8c887f] leading-relaxed">
                Essays, philosophical discourses, and research papers authored by resident faculty and students.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 mt-4">
                <span>Read publications</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link
              href="/college-gallery"
              className="group p-6 rounded-2xl bg-[#0d1611] hover:bg-[#122018] border border-[#1b2d22] hover:border-[#284433] transition-colors"
            >
              <Building2 className="w-5 h-5 text-emerald-400 mb-4" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-[#f7f5ee] mb-1.5 group-hover:text-emerald-300 transition-colors">
                Campus Gallery
              </h3>
              <p className="text-xs sm:text-sm text-[#8c887f] leading-relaxed">
                Photographic records of convocations, academic symposiums, and daily life on the Kasaragod campus.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 mt-4">
                <span>View gallery</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link
              href="/login"
              className="group p-6 rounded-2xl bg-[#0d1611] hover:bg-[#122018] border border-[#1b2d22] hover:border-[#284433] transition-colors"
            >
              <GraduationCap className="w-5 h-5 text-emerald-400 mb-4" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-[#f7f5ee] mb-1.5 group-hover:text-emerald-300 transition-colors">
                Student & Staff Portal
              </h3>
              <p className="text-xs sm:text-sm text-[#8c887f] leading-relaxed">
                Secure system access for enrolled students and instructors to consult timetables, coursework, and grades.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 mt-4">
                <span>Access system</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </section>

        {/* 5. Admissions Notice & Application */}
        <section
          className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-center"
          aria-labelledby="admissions-heading"
        >
          <div className="p-8 sm:p-12 rounded-3xl bg-[#0d1611] border border-[#1e3428]">
            <h2
              id="admissions-heading"
              className="text-2xl sm:text-4xl font-normal text-[#f7f5ee] font-['Playfair_Display',serif] mb-4"
            >
              Admissions for the Academic Session
            </h2>

            <p className="text-sm sm:text-base text-[#a6a095] max-w-xl mx-auto leading-relaxed mb-8">
              Applications are reviewed for secondary and higher integrated streams. We welcome students dedicated to intellectual rigor and personal spiritual development.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <ApplicationForm
                trigger={
                  <button
                    type="button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-sm tracking-wide transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    aria-label="Open admission application form"
                  >
                    <FileText className="w-4 h-4 text-emerald-950" strokeWidth={1.75} />
                    <span>Submit Application</span>
                  </button>
                }
              />

              <a
                href={`tel:${primaryPhone.replace(/[^0-9+]/g, "")}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 border border-white/10 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label={`Call admissions at ${primaryPhone}`}
              >
                <PhoneCall className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                <span>Registrar: {primaryPhone}</span>
              </a>
            </div>

            <p className="text-xs text-[#7e857b] mt-6">
              Jamia Sa-adiya Arabia Campus · Deli, Kasaragod
            </p>
          </div>
        </section>

        {/* Collegiate Footer */}
        <PublicFooter
          settings={settings}
          institutionName={institutionName}
          institutionTagline={institutionTagline}
          showTagline={true}
        />
      </div>
    </div>
  );
}

