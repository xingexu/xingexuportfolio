import type { MetadataRoute } from "next";
import { SITE } from "./data";

// Generates /sitemap.xml at build time. New top-level page? Add it here too.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE.url}/projects`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/resume`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];
}
