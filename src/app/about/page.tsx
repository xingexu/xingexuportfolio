import type { Metadata } from "next";
import About from "@/components/About";
import "./about.css";

export const metadata: Metadata = {
  title: "About",
  description: "A 3D voxel walk through Xinge’s life from age 7 to 18: arriving in Canada, chess and Agar.io at 18 Holsworthy, coding in grade 5, piano and math contests, Bayview volleyball and FBLC, and CS + Ivey at Western.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About · Xinge Xu",
    url: "/about",
  },
};

export default function AboutPage() {
  return <About />;
}
