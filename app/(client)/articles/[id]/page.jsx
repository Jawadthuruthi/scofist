import connectToDB from "@/lib/db";
import Article from "@/models/Article";
import Settings from "@/models/Settings";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, User } from "lucide-react";

import Link from "next/link";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";

export async function generateMetadata({ params }) {
  const { id } = params;
  await connectToDB();
  const article = await Article.findById(id).lean();
  
  if (!article) return { title: "Article Not Found" };

  return {
    title: `${article.title} | Sadiya Dawa College`,
    description: article.content?.substring(0, 160),
    openGraph: {
      title: article.title,
      description: article.content?.substring(0, 160),
      images: article.image?.url ? [{ url: article.image.url }] : [],
    },
  };
}

async function getArticle(id) {
  await connectToDB();
  try {
    const article = await Article.findById(id).lean();
    return article ? JSON.parse(JSON.stringify(article)) : null;
  } catch (error) {
    return null;
  }
}

async function getSettings() {
  await connectToDB();
  const settings = await Settings.findOne().lean();
  return JSON.parse(JSON.stringify(settings));
}

export default async function ArticleDetailPage({ params }) {
  const { id } = params;
  const article = await getArticle(id);
  const settings = await getSettings();

  if (!article) {
    notFound();
  }

  const institutionLogo = settings?.institution?.logo?.url;
  const institutionName = settings?.institution?.name || "Sadiya Dawa College";
  const orgLogo = settings?.org?.logo?.url;
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

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
          <article>
            {/* Navigation Anchor */}
            <div className="mb-8">
              <Link 
                href="/articles" 
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9ca59a] hover:text-[#f7f5ee] px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Return to Publications</span>
              </Link>
            </div>

            {/* Header Info */}
            <header className="mb-10 border-b border-[#1b2b20] pb-8">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#9ca59a] mb-4">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/10">
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-400/80" />
                  <span>{article.date ? format(new Date(article.date), "MMMM d, yyyy") : "Recent Publication"}</span>
                </div>
                {article.author && (
                  <div className="flex items-center gap-1.5 text-[#869183]">
                    <User className="w-3.5 h-3.5" />
                    <span>{article.author}</span>
                  </div>
                )}
              </div>
              <h1 className="font-['Playfair_Display',serif] text-3xl sm:text-5xl font-normal text-[#f7f5ee] leading-[1.2]">
                {article.title}
              </h1>
            </header>

            {/* Featured Image */}
            {article.image?.url && (
              <div className="w-full rounded-2xl overflow-hidden shadow-2xl mb-12 border border-white/[0.08] bg-[#0c140e]">
                <img
                  src={article.image.url}
                  alt={article.title}
                  className="w-full h-auto max-h-[550px] object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="prose prose-invert max-w-none">
              <p className="text-base sm:text-lg text-[#ded9ce] leading-relaxed whitespace-pre-wrap font-sans">
                {article.content}
              </p>
            </div>

            {/* Sharing Section */}
            <div className="mt-14 pt-8 border-t border-[#1b2b20] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#869183]">
                Published by {institutionName}
              </div>
              <ShareButton 
                title={article.title} 
                text={article.content} 
                imageUrl={article.image?.url}
                buttonText="Share Publication"
              />
            </div>
          </article>
        </main>

        <PublicFooter settings={settings} institutionName={institutionName} />
      </div>
    </div>
  );
}
