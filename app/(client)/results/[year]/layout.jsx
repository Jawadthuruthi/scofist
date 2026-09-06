import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export async function generateMetadata({ params }) {
  try {
    const resolvedParams = await params;
    const yearParam = resolvedParams?.year
      ? decodeURIComponent(resolvedParams.year)
      : "";

    await connectToDB();
    const settings = await Settings.findOne({}).lean();

    const numericYear =
      parseInt(yearParam) ||
      (yearParam?.toString().includes("2026") ? 2026 : 2025);

    const matchingFestival =
      settings?.festival ||
      settings?.festivals?.find(
        (f) =>
          f.year?.toString().toLowerCase().includes(yearParam.toString().toLowerCase()) ||
          f.festivalInfo?.year?.toString() === yearParam.toString()
      ) ||
      (numericYear === 2026 ? settings?.festivals?.[0] : settings?.festival);

    const festivalInfo =
      matchingFestival?.festivalInfo || settings?.festival?.festivalInfo || {};
    const festivalName =
      festivalInfo.name || matchingFestival?.name || "esperanza";
    const displayName =
      festivalName.charAt(0).toUpperCase() + festivalName.slice(1);

    const festivalNameImageUrl =
      matchingFestival?.festivalNameImage?.url ||
      settings?.festival?.festivalNameImage?.url ||
      settings?.festivals?.find((f) => f.festivalNameImage?.url)
        ?.festivalNameImage?.url ||
      "https://res.cloudinary.com/do8vcjig0/image/upload/v1787142796/profiles/q4bwbn3hk21k6zonu5t8.png";

    const title = `${displayName} Results | SCOFIST`;
    const description = `Check out declared results and podium winners for ${displayName} (${yearParam || "Festival"})`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: festivalNameImageUrl
          ? [
              {
                url: festivalNameImageUrl,
                width: 1200,
                height: 630,
                alt: `${displayName} Festival Logo`,
              },
            ]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: festivalNameImageUrl ? [festivalNameImageUrl] : [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata for results/[year]:", error);
    return {
      title: "Festival Results | SCOFIST",
      description: "Check out festival results and podium winners",
    };
  }
}

export default function ResultsYearLayout({ children }) {
  return <>{children}</>;
}
