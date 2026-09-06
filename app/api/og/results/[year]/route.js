import { ImageResponse } from "next/og";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export const runtime = "nodejs";

export async function GET(request, { params }) {
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
      festivalInfo.name || matchingFestival?.name || "Festival";

    const festivalLogoUrl =
      matchingFestival?.festivalLogo?.url ||
      settings?.festival?.festivalLogo?.url ||
      settings?.festivals?.find((f) => f.festivalLogo?.url)?.festivalLogo?.url ||
      "https://res.cloudinary.com/do8vcjig0/image/upload/v1787142034/profiles/i5cq1yxqoori5xff52cz.png";

    const festivalNameImageUrl =
      matchingFestival?.festivalNameImage?.url ||
      settings?.festival?.festivalNameImage?.url ||
      settings?.festivals?.find((f) => f.festivalNameImage?.url)
        ?.festivalNameImage?.url ||
      "https://res.cloudinary.com/do8vcjig0/image/upload/v1787142796/profiles/q4bwbn3hk21k6zonu5t8.png";

    const urlObj = new URL(request.url);
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      urlObj.host ||
      "www.scofist.com";
    const protocol =
      request.headers.get("x-forwarded-proto") ||
      (urlObj.protocol ? urlObj.protocol.replace(":", "") : "https");
    const displayUrl = `${protocol}://${host}/results/${yearParam}`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#2563eb",
            padding: "30px 40px",
          }}
        >
          {/* Centered Festival Logo & Name Image */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {/* Festival Logo - 60% size (648px x 648px) in white */}
            {festivalLogoUrl && (
              <img
                src={festivalLogoUrl}
                alt="Festival Logo"
                style={{
                  width: "648px",
                  height: "648px",
                  objectFit: "contain",
                  marginBottom: "12px",
                  filter: "brightness(0) invert(1)",
                }}
              />
            )}

            {/* Festival Name Image - 60% size (648px x 110px) in white */}
            {festivalNameImageUrl ? (
              <img
                src={festivalNameImageUrl}
                alt="Festival Name"
                style={{
                  maxWidth: "648px",
                  maxHeight: "110px",
                  objectFit: "contain",
                  filter: "brightness(0) invert(1)",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: 54,
                  fontWeight: 900,
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {festivalName}
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );
  } catch (error) {
    console.error("Error generating square OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
