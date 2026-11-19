import type { Metadata } from "next";
import Hero from "@/components/Hero";
import HomeIntro from "@/components/HomeIntro";

export const metadata: Metadata = {
  alternates: { canonical: "/home" },
  openGraph: { url: "/home" },
};

/**
 * Home route. Server component — the Hero (a client component for its typing
 * animation) is still server-rendered into the initial HTML, so all content is
 * indexable. The .page-enter wrapper provides the entrance animation via CSS,
 * and sits inside HomeIntro so it replays once the first-load reveal ends.
 */
export default function Page() {
  return (
    <HomeIntro>
      <div className="page-enter">
        <Hero />
      </div>
    </HomeIntro>
  );
}
