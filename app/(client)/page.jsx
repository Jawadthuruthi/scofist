import Home from "@/components/Home";

// Generate static metadata for the home page
export const metadata = {
  title:
    "Sadiya Dawa College | Premier Islamic College of Integrated Studies - SCOFIST",
  description:
    "Welcome to Sadiya Dawa College (Sa-adiya Da-awa College), Kerala's leading Islamic educational institution. We offer comprehensive Islamic and integrated studies programs with academic excellence and spiritual growth. Explore our courses, admissions, and campus life.",
  keywords:
    "Sadiya Dawa College, Islamic College Kerala, Islamic Education, Integrated Studies, SCOFIST, Da-awa College, Islamic Higher Education, Kasaragod College, Islamic University India",

  openGraph: {
    title:
      "Sadiya Dawa College | Premier Islamic College of Integrated Studies",
    description:
      "Join Kerala's leading Islamic educational institution offering comprehensive programs for intellectual and spiritual development. Discover our courses and admission process.",
    url: "https://www.scofist.com",
    type: "website",
    locale: "en_US",
    siteName: "Sadiya Dawa College",
    images: [
      {
        url: "/sdc_seal.png",
        width: 1200,
        height: 630,
        alt: "Sadiya Dawa College - Islamic College of Integrated Studies",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Sadiya Dawa College | Islamic College of Integrated Studies",
    description:
      "Kerala's premier Islamic educational institution offering comprehensive programs for academic excellence and spiritual growth.",
    images: ["/sdc_seal.png"],
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: "https://www.scofist.com",
  },

  other: {
    "DC.title": "Sadiya Dawa College - Home",
    "DC.description":
      "Premier Islamic College offering integrated studies in Kerala, India",
    "DC.subject": "Islamic Education, Higher Education, College Admissions",
  },
};

// Force static rendering for optimal SEO
export const dynamic = "force-static";
export const revalidate = false;

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": "https://www.scofist.com/#organization",
        name: "Sadiya Dawa College",
        alternateName: [
          "Sa-adiya Da-awa College",
          "SCOFIST",
          "Islamic College of Integrated Studies",
        ],
        url: "https://www.scofist.com",
        logo: {
          "@type": "ImageObject",
          url: "https://www.scofist.com/logo.svg",
          width: 200,
          height: 200,
        },
        description:
          "Premier Islamic college in Kerala offering integrated studies, academic excellence, and spiritual growth programs",
        foundingDate: "2009",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Kasaragod",
          addressRegion: "Kerala",
          addressCountry: "IN",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+91-8943264498",
          contactType: "Admissions",
          email: "ksdjabbu@gmail.com",
          availableLanguage: ["English", "Malayalam", "Arabic"],
        },
        sameAs: ["https://instagram.com/jawad_thuruthi"],
      },
      {
        "@type": "WebSite",
        "@id": "https://www.scofist.com/#website",
        url: "https://www.scofist.com",
        name: "Sadiya Dawa College",
        description:
          "Official website of Sadiya Dawa College - Islamic College of Integrated Studies",
        publisher: {
          "@id": "https://www.scofist.com/#organization",
        },
        inLanguage: "en-US",
      },
      {
        "@type": "WebPage",
        "@id": "https://www.scofist.com/#webpage",
        url: "https://www.scofist.com",
        name: "Sadiya Dawa College | Premier Islamic College of Integrated Studies",
        description:
          "Welcome to Sadiya Dawa College, Kerala's leading Islamic educational institution offering comprehensive programs for academic and spiritual excellence",
        isPartOf: {
          "@id": "https://www.scofist.com/#website",
        },
        about: {
          "@id": "https://www.scofist.com/#organization",
        },
        inLanguage: "en-US",
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.scofist.com/#breadcrumb",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.scofist.com",
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Home />
    </>
  );
}
