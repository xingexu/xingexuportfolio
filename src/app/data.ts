/* ── Shared site data & config ──────────────────────────────────────────── */

/**
 * Public site URL. Used for canonical tags, Open Graph, sitemap and robots.
 * Set NEXT_PUBLIC_SITE_URL in your deploy environment (e.g. Vercel) to your
 * real domain. The fallback is only used for local development.
 */
export const SITE = {
  name: "Xinge Xu",
  role: "Fullstack Software Developer",
  description:
    "Xinge Xu — Fullstack Software Developer. Grade 12 IB student at Bayview Secondary and incoming Western CS + Ivey AEO student. Building systems, full-stack apps, and business-minded software.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export type Project = {
  num: string;
  name: string;
  desc: string;
  stack: string[];
  year: string;
  url?: string;
};

export const PROJECTS: Project[] = [
  {
    num: "01",
    name: "Drift",
    desc: "Currently building a focus-tracking app for students with activity insights, website blocking, study analytics, and clear signals for whether time online is actually focused.",
    stack: ["Next.js", "TypeScript", "Analytics"],
    year: "2026",
  },
];

export const LINKS = {
  github: "https://github.com/xingexu",
  linkedin: "https://www.linkedin.com/in/xinge-xu-5b4191306/",
  // Gmail compose in a new tab (mailto: silently fails without a mail app)
  email: "https://mail.google.com/mail/?view=cm&fs=1&to=xxu767@uwo.ca",
} as const;
