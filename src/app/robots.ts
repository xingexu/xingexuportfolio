import type { MetadataRoute } from "next";
import { SITE } from "./data";

// Generates /robots.txt automatically at build time — nothing to crawl-block
// here, we just point search engines at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
