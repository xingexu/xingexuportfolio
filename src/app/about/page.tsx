import type { Metadata } from "next";
import About from "@/components/About";
import "./about.css";

export const metadata: Metadata = {
  title: "About",
  description: "Explore a colorful pixel airport as six-year-old Xinge arrives in Canada. Walk off the plane, through arrivals, and into the first chapter with WASD.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About · Xinge Xu",
    url: "/about",
  },
};

export default function AboutPage() {
  return <About />;
}
