import { PROJECTS, type Project } from "@/app/data";

/**
 * Projects grid. Server component — fully indexable HTML, pure-CSS hover.
 */
export default function Projects() {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        maxWidth: 1040,
        margin: "0 auto",
        padding: "130px 28px 100px",
      }}
    >
      <h1
        className="font-pixel"
        style={{ fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 700, color: "var(--text)", marginBottom: 48 }}
      >
        projects
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 28 }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em" }}>{p.num}</span>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{p.year}</span>
      </div>

      <h2 className="project-title" style={{ marginBottom: 12 }}>
        {p.name.toLowerCase()}
        {p.url && (
          <span aria-hidden style={{ marginLeft: 8, fontSize: 13, color: "var(--accent)" }}>
            ↗
          </span>
        )}
      </h2>

      <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)", marginBottom: 20 }}>{p.desc}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {p.stack.map((s) => (
          <span key={s} className="px-chip">
            {s.toLowerCase()}
          </span>
        ))}
      </div>
    </>
  );

  if (p.url) {
    return (
      <a
        className="project-card"
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${p.name} — visit live site (opens in a new tab)`}
      >
        {inner}
      </a>
    );
  }

  return <article className="project-card">{inner}</article>;
}
