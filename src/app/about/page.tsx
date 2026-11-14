import type { Metadata } from "next";
import About from "@/components/About";
import "./about.css";

export const metadata: Metadata = {
  title: "About",
  description: "Walk through Xinge’s childhood with WASD: arrive in Canada, then visit the first home in Markham where chess began.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About · Xinge Xu",
    url: "/about",
  },
};

export default function AboutPage() {
  return <About />;
}
