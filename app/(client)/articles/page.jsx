import connectToDB from "@/lib/db";
import Article from "@/models/Article";
import Settings from "@/models/Settings";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import ArticleCard from "@/components/ArticleCard";
import { Newspaper } from "lucide-react";

export const metadata = {
  title: "Articles | Sadiya Dawa College",
  description: "Read the latest articles from Sadiya Dawa College.",
};

export const dynamic = "force-dynamic";

async function getArticles() {
  await connectToDB();
  const articles = await Article.find({}).sort({ date: -1 }).lean();
  return JSON.parse(JSON.stringify(articles));
}

async function getSettings() {
  await connectToDB();
  const settings = await Settings.findOne().lean();
  return JSON.parse(JSON.stringify(settings));
}

export default async function ArticlesPage() {
  const articles = await getArticles();
  const settings = await getSettings();

  const institutionLogo = settings?.institution?.logo?.url;
  const updatesLogo = settings?.institution?.updatesLogo?.url;
  const orgLogo = settings?.org?.logo?.url;
  const institutionName = settings?.institution?.name || "Sadiya Dawa College";
  const orgName = settings?.org?.name || "Organisation";

  return (
    <div className="relative min-h-screen bg-[#080c09] text-[#ded9ce] selection:bg-emerald-900/50 selection:text-emerald-100 font-sans flex flex-col">
      {/* Subtle atmospheric ground */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(1000px 500px at 50% -80px, rgba(20, 80, 50, 0.3), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col flex-1">
        <PublicHeader 
          centerLogo={institutionLogo} 
          name={institutionName} 
          centered={true}
        />

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          {/* Editorial Section Header */}
          <div className="border-b border-[#1b2b20] pb-6 mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
              <span className="text-xs font-medium text-[#9ca59a]">
                Academic Discourse & Research
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#f7f5ee] font-['Playfair_Display',serif] tracking-tight">
              Scholarly Articles
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#a6a095] max-w-2xl leading-relaxed">
              Essays, philosophical discourses, and research papers authored by resident faculty, scholars, and integrated degree students.
            </p>
          </div>

          {/* Articles List */}
          {articles.length === 0 ? (
            <div className="text-center py-20 bg-[#0c140e] rounded-2xl border border-white/[0.06] max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#8f9b8a]">
                <Newspaper className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-medium text-[#f7f5ee]">No articles published yet</h2>
              <p className="text-sm text-[#8a9187] mt-1.5">New academic papers and publications will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {articles.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          )}
        </main>

        <PublicFooter settings={settings} institutionName={institutionName} />
      </div>
    </div>
  );
}
