import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE, LINKS } from "./data";
import Nav from "@/components/Nav";
import Background from "@/components/Background";
import Footer from "@/components/Footer";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-je",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Xinge Xu — Fullstack Software Developer",
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
    title: "Xinge Xu — Fullstack Software Developer",
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xinge Xu — Fullstack Software Developer",
    description: SITE.description,
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
  themeColor: "#f7f9fc",
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
    <html lang="en" className={`${plexSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen antialiased font-sans" style={{ background: "var(--bg)", color: "var(--text)" }}>
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
