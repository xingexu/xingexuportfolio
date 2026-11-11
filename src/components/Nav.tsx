"use client";

import { TransitionLink as Link } from "@/components/PageTransitions";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

/**
 * Top navigation. Real crawlable links; active state via usePathname.
 * The theme-colored header fades into the live sky below it.
 */
export default function Nav() {
  const pathname = usePathname();
  const isAbout = pathname === "/about";

  return (
    // Fixed to the top so it stays put while the page (and the sky behind it) scrolls.
    <header className={`nav-bar${isAbout ? " nav-bar-about" : ""}`} style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}>
      <nav
        aria-label="Primary"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          height: 60,
          maxWidth: 1040,
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        {isAbout && <Link href="/" className="about-home-link" aria-label="Back to home">← <span>xinge xu</span></Link>}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Link href="/about" aria-current={isAbout ? "page" : undefined} className="nav-link">
            about
          </Link>
          <Link href="/projects" aria-current={pathname === "/projects" ? "page" : undefined} className="nav-link">
            projects
          </Link>
          {/* startsWith covers /resume/editor too, so the link still lights up in the PDF viewer */}
          <Link href="/resume" aria-current={pathname.startsWith("/resume") ? "page" : undefined} className="nav-link">
            resume
          </Link>
          {!isAbout && <ThemeToggle />}
        </div>
      </nav>
    </header>
  );
}
