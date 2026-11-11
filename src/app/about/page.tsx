import type { Metadata } from "next";
import About from "@/components/About";
import "./about.css";

export const metadata: Metadata = {
  title: "About",
  description: "Meet Xinge Xu, an 18-year-old CS + Ivey student at Western who loves coding, building projects, chess, volleyball, and finding new food spots.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About · Xinge Xu",
    url: "/about",
  },
};

export default function AboutPage() {
  return <About />;
}
