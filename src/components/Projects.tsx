import { PROJECTS, type Project } from "@/app/data";

/**
 * Projects grid. Server component — content is fully server-rendered HTML so it
 * is indexable and shareable at /projects. Hover effects are pure CSS (see
 * globals.css .project-card), so no client JS is required.
 */
export default function Projects() {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        maxWidth: 1100,
        margin: "0 auto",
        padding: "120px 48px 100px",
      }}
    >
      <div style={{ marginBottom: 64, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="blue-bar" />
          <h1 style={{ fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 700, letterSpacing: "-0.045em", color: "var(--text)", lineHeight: 0.95 }}>
            Things I&apos;ve built
          </h1>
        </div>
        <span className="pill">
          <span className="dot" />
          {PROJECTS.length} projects
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {PROJECTS.map((p) => (
          <ProjectCard key={p.num} project={p} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const inner = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue-btn)", letterSpacing: "0.06em" }}>{p.num}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>{p.year}</span>
      </div>

      <h2 className="project-title" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.035em", marginBottom: 14, lineHeight: 1.15, display: "flex", alignItems: "center", gap: 8 }}>
        {p.name}
        {p.url && (
          <span className="project-arrow" aria-hidden style={{ fontSize: 16, color: "var(--blue-btn)" }}>
            ↗
          </span>
        )}
      </h2>

      <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-2)", marginBottom: 26 }}>{p.desc}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {p.stack.map((s) => (
          <span
            key={s}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--blue-btn)",
              background: "var(--pill-bg)",
              border: "1px solid var(--pill-border)",
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {p.url && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 22,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--blue-btn)",
            letterSpacing: "-0.01em",
          }}
        >
          Visit live site
          <span className="project-arrow" aria-hidden>↗</span>
        </span>
      )}
    </>
  );

  const baseStyle = { padding: "36px", backdropFilter: "blur(12px)" as const };

  if (p.url) {
    return (
      <a
        className="project-card"
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${p.name} — visit live site (opens in a new tab)`}
        style={{ ...baseStyle, display: "block", textDecoration: "none", color: "inherit" }}
      >
        {inner}
      </a>
    );
  }

  return (
    <article className="project-card" style={baseStyle}>
      {inner}
    </article>
  );
}
