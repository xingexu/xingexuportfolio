"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Top navigation. Uses real links (crawlable) and usePathname for active state,
 * replacing the previous JS tab-switching that had no URLs.
 */
export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const onHome = pathname === "/";
  const onProjects = pathname === "/projects";

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background 0.3s, border-color 0.3s",
        background: scrolled ? "var(--bg-nav)" : "transparent",
        backdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
        borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
      }}
    >
      <nav
        aria-label="Primary"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 56, gap: 6, padding: "0 32px" }}
      >
        <Link
          href="/"
          aria-current={onHome ? "page" : undefined}
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: onHome ? "var(--text)" : "var(--text-2)",
            textDecoration: "none",
            padding: "4px 8px",
            borderRadius: 6,
            transition: "color 0.2s",
          }}
        >
          xinge xu
        </Link>

        <span aria-hidden style={{ color: "var(--blue)", fontSize: 10, userSelect: "none", margin: "0 8px" }}>
          ◆
        </span>

        <Link
          href="/projects"
          aria-current={onProjects ? "page" : undefined}
          style={{
            fontSize: 13,
            fontWeight: onProjects ? 600 : 400,
            color: onProjects ? "var(--blue-btn)" : "var(--text-3)",
            background: onProjects ? "var(--pill-bg)" : "none",
            border: `1px solid ${onProjects ? "var(--pill-border)" : "transparent"}`,
            textDecoration: "none",
            padding: "4px 14px",
            borderRadius: 999,
            transition: "color 0.2s, background 0.2s, border-color 0.2s",
            letterSpacing: "-0.01em",
          }}
        >
          Projects
        </Link>
      </nav>
    </header>
  );
}
