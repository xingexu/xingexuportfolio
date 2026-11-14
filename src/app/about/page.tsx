import type { Metadata } from "next";
import About from "@/components/About";
import "./about.css";

export const metadata: Metadata = {
  title: "About",
  description: "Walk through Xinge Xu’s pixel world with WASD. Explore coding, Western CS + Ivey, chess, volleyball, and new food spots through a playable About page.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About · Xinge Xu",
    url: "/about",
  },
};

export default function AboutPage() {
  return <About />;
}
