import type { Metadata } from "next";
import Resume from "@/components/Resume";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Resume for Xinge Xu, fullstack software developer and incoming Western Computer Science + Ivey AEO student.",
  alternates: { canonical: "/resume" },
  openGraph: {
    title: "Resume · Xinge Xu",
    description:
      "Resume for Xinge Xu, fullstack software developer and incoming Western Computer Science + Ivey AEO student.",
    url: "/resume",
  },
};

export default function ResumePage() {
  return (
    <div className="tab-enter">
      <Resume />
    </div>
  );
}
