"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

/**
 * Top navigation. Real crawlable links; active state via usePathname.
 * Solid pixel bar — no blur, no transparency tricks.
 */
export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Link href="/projects" aria-current={pathname === "/projects" ? "page" : undefined} className="nav-link">
            projects
          </Link>
          <Link href="/resume" aria-current={pathname.startsWith("/resume") ? "page" : undefined} className="nav-link">
            resume
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
