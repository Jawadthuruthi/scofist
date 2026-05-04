import connectToDB from "@/lib/db";
import Update from "@/models/Update";
import Settings from "@/models/Settings";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
  const { id } = params;
  await connectToDB();
  const update = await Update.findById(id).lean();
  
  if (!update) return { title: "Update Not Found" };

  return {
    title: `${update.heading} | Sadiya Dawa College`,
    description: update.news?.substring(0, 160),
    openGraph: {
      title: update.heading,
      description: update.news?.substring(0, 160),
      images: update.image?.url ? [{ url: update.image.url }] : [],
    },
  };
}

async function getUpdate(id) {
  await connectToDB();
  try {
    const update = await Update.findById(id).lean();
    return update ? JSON.parse(JSON.stringify(update)) : null;
  } catch (error) {
    return null;
  }
}

async function getSettings() {
  await connectToDB();
  const settings = await Settings.findOne().lean();
  return JSON.parse(JSON.stringify(settings));
}

export default async function UpdateDetailPage({ params }) {
  const { id } = params;
  const update = await getUpdate(id);
  const settings = await getSettings();

  if (!update) {
    notFound();
  }

  const institutionLogo = settings?.institution?.logo?.url;
  const institutionName = settings?.institution?.name || "Sadiya Dawa College";

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <PublicHeader logo={institutionLogo} name={institutionName} />

      <main className="flex-1">
        <article className="max-w-4xl mx-auto py-12 px-6">
          {/* Back Button */}
          <Link 
            href="/updates" 
            className="inline-flex items-center gap-2 text-emerald-600 font-bold mb-8 hover:gap-3 transition-all group"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Updates
          </Link>

          {/* Header Info */}
          <header className="mb-10">
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold uppercase tracking-widest mb-4">
              <CalendarIcon className="w-4 h-4" />
              {update.date ? format(new Date(update.date), "MMMM d, yyyy") : "Recent Update"}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
              {update.heading}
            </h1>
          </header>

          {/* Featured Image */}
          {update.image?.url && (
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl mb-12 border border-gray-100">
              <Image
                src={update.image.url}
                alt={update.heading}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed text-xl md:text-2xl whitespace-pre-wrap font-medium">
              {update.news}
            </p>
          </div>

          {/* Sharing Section */}
          <div className="mt-16 pt-10 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-gray-500 font-medium">
              Shared by {institutionName} Admin
            </div>
            {/* Simple Share Button - In a real app we'd use Web Share API */}
            <Button variant="outline" className="rounded-full flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <Share2 className="w-4 h-4" />
              Share this Update
            </Button>
          </div>
        </article>
      </main>

      <PublicFooter settings={settings} institutionName={institutionName} />
    </div>
  );
}
