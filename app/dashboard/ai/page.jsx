import CollegeAdminAISearch from "@/components/CollegeAdminAISearch";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AIPage() {
  const apiKey = process.env.API_KEY;
  let settings = null;
  try {
    settings = await fetchData("settings", "", 60);
  } catch (err) {
    console.error("Error loading settings for AI search page:", err);
  }

  return (
    <div className="flex flex-col">
      <Header
        title="AI ASSISTANT"
        subTitle="Intelligent institutional search by Gemini"
        icon={<Sparkles className="h-5 w-5 text-emerald-500" />}
        className="mb-0 pb-1"
      />
      <div>
        <CollegeAdminAISearch settings={settings} apiKey={apiKey} className="mt-1 mb-3" />
      </div>
    </div>
  );
}
