import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Silkscreen } from "next/font/google";
import "./globals.css";
import { SITE, LINKS } from "./data";
import Nav from "@/components/Nav";
import Background from "@/components/Background";
import Footer from "@/components/Footer";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-je",
  weight: ["400", "500", "700"],
});

const silkscreen = Silkscreen({
  subsets: ["latin"],
  variable: "--font-silk",
  weight: ["400", "700"],
});

/** Runs before hydration so the local-time sky and matching UI appear on the first paint. */
const themeInit = `(function(){try{var d=new Date(),m=d.getHours()*60+d.getMinutes(),p=m>=510&&m<=990?"day":(m>=1411||m<=210?"night":"twilight");document.documentElement.dataset.skyPhase=p;document.documentElement.dataset.theme=p==="night"?"dark":"light"}catch(e){document.documentElement.dataset.skyPhase="night";document.documentElement.dataset.theme="dark"}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Xinge Xu",
    template: "%s · Xinge Xu",
  },
  description: SITE.description,
  applicationName: "Xinge Xu",
  authors: [{ name: "Xinge Xu" }],
  creator: "Xinge Xu",
  keywords: [
    "Xinge Xu",
    "Fullstack Software Developer",
    "Web Developer",
    "Next.js",
    "React",
    "TypeScript",
    "Western CS",
    "Ivey AEO",
    "Portfolio",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Xinge Xu",
    title: "Xinge Xu",
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xinge Xu",
    description: SITE.description,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#04070f" },
    { media: "(prefers-color-scheme: light)", color: "#cfe8fa" },
  ],
  width: "device-width",
  initialScale: 1,
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Xinge Xu",
  url: SITE.url,
  jobTitle: "Fullstack Software Developer",
  description: SITE.description,
  image: `${SITE.url}/photo.png`,
  alumniOf: { "@type": "EducationalOrganization", name: "Bayview Secondary School" },
  sameAs: [LINKS.github, LINKS.linkedin],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${silkscreen.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className="min-h-screen antialiased"
        style={{ background: "var(--bg)", color: "var(--text)" }}
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <Background />
        <Nav />
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
