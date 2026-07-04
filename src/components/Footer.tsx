import { LINKS } from "@/app/data";

/**
 * Footer. Server component with crawlable contact links. One line, minimal.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        position: "relative",
        zIndex: 10,
        borderTop: "2px solid var(--border)",
        background: "var(--panel)",
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "20px 28px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>© {year} xinge xu</span>

        <nav aria-label="Social and contact" style={{ display: "flex", gap: 20 }}>
          {[
            { label: "github", href: LINKS.github },
            { label: "linkedin", href: LINKS.linkedin },
            { label: "email", href: LINKS.email },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="px-link"
              style={{ fontSize: 12 }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
