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
    <div className="relative min-h-screen bg-white dark:bg-[#080c09] text-neutral-900 dark:text-neutral-100 selection:bg-emerald-100 dark:selection:bg-[#1b2b20] selection:text-emerald-900 dark:selection:text-[#f7f5ee] font-montserrat transition-colors duration-300">
      {/* Subtle atmospheric ground */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-10 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(1000px 500px at 50% -80px, rgba(20, 80, 50, 0.2), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {backgroundImage && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-25 dark:opacity-15 filter blur-[0.3px] dark:blur-[1.5px] transition-opacity duration-300"
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

        {/* 1. Hero Section */}
        <section
          className="pt-20 sm:pt-28 md:pt-36 pb-20 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center"
          aria-labelledby="hero-title"
        >
          {/* Institutional Affiliation Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-white/90 dark:bg-white/[0.03] border border-neutral-300 dark:border-white/[0.08] mb-7 sm:mb-8 backdrop-blur-sm shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            <span className="text-xs font-semibold tracking-normal text-neutral-800 dark:text-[#a6ada4]">
              Jamia Sa-adiya Arabia · Kasaragod, Kerala
            </span>
          </div>

          <h1
            id="hero-title"
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 leading-[1.12] max-w-4xl mx-auto text-balance"
          >
            Where Sacred Wisdom Meets Contemporary Intellect
          </h1>

          <p className="mt-6 mb-12 sm:mb-14 max-w-2xl mx-auto text-base sm:text-lg text-neutral-800 dark:text-neutral-300 leading-relaxed font-normal">
            {institutionTagline}
          </p>

          {/* Action Navigation: Hero Buttons */}
          <div className="mb-16 md:mb-20">
            <AuthButtons variant="hero" />
          </div>

          {/* Institutional Pedigree Strip */}
          <div className="border-t border-b border-neutral-300/80 dark:border-[#1b2b20] py-4 max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-400 font-medium tracking-wide">
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
          <div className="border-b border-neutral-200 dark:border-[#1b2b20] pb-4 mb-10">
            <h2
              id="charter-heading"
              className="text-2xl sm:text-3xl font-bold text-neutral-950 dark:text-neutral-50 tracking-tight"
            >
              Foundational Charter
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              The moral and intellectual commitment guiding Sa-adiya Dawa College.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 md:gap-14">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100 flex items-center gap-2">
                <span>Institutional Vision</span>
              </h3>
              <p className="text-sm sm:text-base text-neutral-800 dark:text-neutral-300 leading-relaxed">
                To stand as a leading center of holistic learning where classical Islamic epistemologies harmoniously integrate with contemporary academic scholarship—nurturing graduates who are spiritually steadfast, intellectually disciplined, and dedicated to the ethical betterment of human society.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100 flex items-center gap-2">
                <span>The Core Mission</span>
              </h3>
              <ul className="space-y-3 text-sm sm:text-base text-neutral-800 dark:text-neutral-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 mt-2 shrink-0" />
                  <span>
                    Deliver a rigorous dual curriculum synthesizing traditional Islamic studies with accredited university bachelor degrees.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 mt-2 shrink-0" />
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
          <div className="border-b border-neutral-200 dark:border-[#1b2b20] pb-4 mb-10">
            <h2
              id="curriculum-heading"
              className="text-2xl sm:text-3xl font-bold text-neutral-950 dark:text-neutral-50 tracking-tight"
            >
              The Integrated Curriculum
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Concurrent theological formation and recognised collegiate degree programs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Track 1: Islamic Sciences */}
            <div className="p-7 rounded-2xl bg-white/95 dark:bg-[#0d1611] border border-neutral-200 dark:border-[#1b2d22] transition-colors hover:border-emerald-500/40 dark:hover:border-[#243d2e] shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-200 dark:border-[#1e3327]">
                <h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">
                  Classical Islamic Sciences &amp; Dawa
                </h3>
                <span className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">Theological Core</span>
              </div>
              <p className="text-sm text-neutral-800 dark:text-neutral-300 leading-relaxed mb-5">
                Comprehensive study of foundational Islamic disciplines under traditional scholarly tutelage:
              </p>
              <ul className="space-y-2 text-sm text-neutral-900 dark:text-neutral-200 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Quranic Exegesis (Tafsir) &amp; Hermeneutics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Hadith Literature &amp; Methodology</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Islamic Jurisprudence (Fiqh &amp; Usul al-Fiqh)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Classical Arabic Grammar &amp; Rhetoric (Balagha)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Dawa Methodology &amp; Comparative Religion</span>
                </li>
              </ul>
            </div>

            {/* Track 2: University Degree */}
            <div className="p-7 rounded-2xl bg-white/95 dark:bg-[#0d1611] border border-neutral-200 dark:border-[#1b2d22] transition-colors hover:border-emerald-500/40 dark:hover:border-[#243d2e] shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-200 dark:border-[#1e3327]">
                <h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">
                  Accredited University Programs
                </h3>
                <span className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">Undergraduate Degree</span>
              </div>
              <p className="text-sm text-neutral-800 dark:text-neutral-300 leading-relaxed mb-5">
                Recognised university undergraduate streams pursued concurrently on campus:
              </p>
              <ul className="space-y-2 text-sm text-neutral-900 dark:text-neutral-200 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Bachelor of Arts (Humanities &amp; Social Sciences)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Bachelor of Commerce (Finance &amp; Management)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Modern English Literature &amp; Academic Writing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Information Technology &amp; Computer Applications</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span>Research Methodology &amp; Contemporary Seminars</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Supporting Campus Features */}
          <div className="grid sm:grid-cols-2 gap-6 mt-6">
            <div className="p-5 rounded-xl bg-white/95 dark:bg-[#0b120e] border border-neutral-200 dark:border-[#17251c] flex items-start gap-4 shadow-sm dark:shadow-none">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                <Users className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">Residential Mentorship</h4>
                <p className="text-xs text-neutral-700 dark:text-neutral-400 mt-1 leading-relaxed">
                  Scholars and faculty reside on campus, providing ongoing intellectual guidance, character cultivation, and moral oversight.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white/95 dark:bg-[#0b120e] border border-neutral-200 dark:border-[#17251c] flex items-start gap-4 shadow-sm dark:shadow-none">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                <Building2 className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">Kasaragod Sanctuary</h4>
                <p className="text-xs text-neutral-700 dark:text-neutral-400 mt-1 leading-relaxed">
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
          <div className="border-b border-neutral-200 dark:border-[#1b2b20] pb-4 mb-10">
            <h2
              id="inquiries-heading"
              className="text-2xl sm:text-3xl font-bold text-neutral-950 dark:text-neutral-50 tracking-tight"
            >
              Academic Life &amp; Resources
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Publications, photographic archives, and student portal access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/articles"
              className="group p-6 rounded-2xl bg-white/95 dark:bg-[#0d1611] hover:bg-white dark:hover:bg-[#122018] border border-neutral-200 dark:border-[#1b2d22] hover:border-emerald-500/40 dark:hover:border-[#284433] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-sm dark:shadow-none"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-4 group-hover:border-emerald-400 dark:group-hover:border-emerald-700/50 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/60 transition-colors">
                <BookOpen className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mb-1.5 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                Scholarly Articles
              </h3>
              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed">
                Essays, philosophical discourses, and research papers authored by resident faculty and students.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 mt-4">
                <span>Read publications</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>

            <Link
              href="/college-gallery"
              className="group p-6 rounded-2xl bg-white/95 dark:bg-[#0d1611] hover:bg-white dark:hover:bg-[#122018] border border-neutral-200 dark:border-[#1b2d22] hover:border-emerald-500/40 dark:hover:border-[#284433] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-sm dark:shadow-none"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-4 group-hover:border-emerald-400 dark:group-hover:border-emerald-700/50 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/60 transition-colors">
                <Building2 className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mb-1.5 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                Campus Gallery
              </h3>
              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed">
                Photographic records of convocations, academic symposiums, and daily life on the Kasaragod campus.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 mt-4">
                <span>View gallery</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>

            <Link
              href="/login"
              className="group p-6 rounded-2xl bg-white/95 dark:bg-[#0d1611] hover:bg-white dark:hover:bg-[#122018] border border-neutral-200 dark:border-[#1b2d22] hover:border-emerald-500/40 dark:hover:border-[#284433] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-sm dark:shadow-none"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-4 group-hover:border-emerald-400 dark:group-hover:border-emerald-700/50 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/60 transition-colors">
                <GraduationCap className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-100 mb-1.5 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                Student &amp; Staff Portal
              </h3>
              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed">
                Secure system access for enrolled students and instructors to consult timetables, coursework, and grades.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 mt-4">
                <span>Access system</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        </section>

        {/* 5. Admissions Notice & Application */}
        <section
          className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-center"
          aria-labelledby="admissions-heading"
        >
          <div className="p-8 sm:p-12 rounded-3xl bg-white/95 dark:bg-[#0d1611] border border-neutral-200 dark:border-[#1e3428] shadow-sm dark:shadow-none">
            <h2
              id="admissions-heading"
              className="text-2xl sm:text-4xl font-bold text-neutral-950 dark:text-neutral-50 tracking-tight mb-4 text-balance"
            >
              Admissions for the Academic Session
            </h2>

            <p className="text-sm sm:text-base text-neutral-800 dark:text-neutral-300 max-w-xl mx-auto leading-relaxed mb-8">
              Applications are reviewed for secondary and higher integrated streams. We welcome students dedicated to intellectual rigor and personal spiritual development.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <ApplicationForm
                trigger={
                  <button
                    type="button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#1a2217] dark:bg-[#f7f5ee] hover:bg-black dark:hover:bg-white text-white dark:text-[#07160d] font-semibold text-sm tracking-normal transition-all duration-300 shadow-[0_4px_20px_rgba(26,34,23,0.15)] dark:shadow-[0_4px_20px_rgba(247,245,238,0.12)] hover:shadow-[0_6px_28px_rgba(26,34,23,0.25)] dark:hover:shadow-[0_6px_28px_rgba(247,245,238,0.22)] active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                    aria-label="Open admission application form"
                  >
                    <FileText className="w-4 h-4" strokeWidth={1.75} />
                    <span>Submit Application</span>
                  </button>
                }
              />

              <a
                href={`tel:${primaryPhone.replace(/[^0-9+]/g, "")}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-white/[0.04] hover:bg-neutral-100 dark:hover:bg-white/[0.08] text-neutral-900 dark:text-[#ded9ce] hover:text-black dark:hover:text-[#f7f5ee] border border-neutral-300 dark:border-white/10 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-sm dark:shadow-none"
                aria-label={`Call admissions at ${primaryPhone}`}
              >
                <PhoneCall className="w-4 h-4 text-emerald-700 dark:text-[#8f9b8a]" strokeWidth={1.5} />
                <span>Registrar: {primaryPhone}</span>
              </a>
            </div>

            <p className="text-xs text-neutral-600 dark:text-[#a6b09f] mt-6">
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

