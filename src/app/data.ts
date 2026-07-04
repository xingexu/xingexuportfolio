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
    desc: "AI filter for business communication — cuts outreach noise, surfaces real inquiries in real time.",
    stack: ["Next.js", "Supabase", "NLP"],
    year: "2024",
  },
  {
    num: "02",
    name: "NFASS Journal",
    desc: "Full-stack publishing platform with clean content workflows and database-backed storage.",
    stack: ["PostgreSQL", "Backend Systems", "Database Design"],
    year: "2024",
    url: "https://nfast.vercel.app/",
  },
];

export const LINKS = {
  github: "https://github.com/xingexu",
  linkedin: "https://www.linkedin.com/in/xinge-xu-5b4191306/",
  email: "mailto:xingexu1107@gmail.com",
} as const;
