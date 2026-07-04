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
          justifyContent: "space-between",
          height: 54,
          maxWidth: 1040,
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className="nav-link"
          style={{ paddingLeft: 0, border: "none", background: "none", color: pathname === "/" ? "var(--text)" : undefined }}
        >
          xinge xu
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/projects" aria-current={pathname === "/projects" ? "page" : undefined} className="nav-link">
            projects
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
