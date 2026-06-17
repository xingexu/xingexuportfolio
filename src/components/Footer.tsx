import { LINKS } from "@/app/data";

/**
 * Footer with crawlable contact links. Server component. Provides additional
 * indexable links and a clear contact path for both users and search engines.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        position: "relative",
        zIndex: 10,
        borderTop: "1px solid var(--border)",
        background: "var(--bg-nav)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 32px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--text-3)", letterSpacing: "-0.01em" }}>
          © {year} Xinge Xu
        </span>

        <nav aria-label="Social and contact" style={{ display: "flex", gap: 24 }}>
          {[
            { label: "GitHub", href: LINKS.github },
            { label: "LinkedIn", href: LINKS.linkedin },
            { label: "Email", href: LINKS.email },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="link-grow"
              style={{ fontSize: 13, color: "var(--text-2)", letterSpacing: "-0.01em" }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
