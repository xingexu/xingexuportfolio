import type { Metadata } from "next";
import Projects from "@/components/Projects";
import BackHome from "@/components/BackHome";
import { PROJECTS } from "../data";

export const metadata: Metadata = {
  title: "Projects",
  description: `Selected projects by Xinge Xu, including ${PROJECTS.map((p) => p.name).join(" and ")}.`,
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Projects · Xinge Xu",
    description: `Selected projects by Xinge Xu, including ${PROJECTS.map((p) => p.name).join(" and ")}.`,
    url: "/projects",
  },
};

/**
 * Projects route. Fully server-rendered content at a real, shareable URL.
 */
export default function ProjectsPage() {
  return (
    <div className="tab-enter">
      <Projects />
      <BackHome />
    </div>
  );
}
