import type { MetadataRoute } from "next";
import { SITE } from "./data";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE.url}/projects`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/resume`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];
}
