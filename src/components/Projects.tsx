import Image from "next/image";
import BackHome from "@/components/BackHome";
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

      <section className="drift-showcase" aria-labelledby="drift-preview-title">
        <div className="drift-preview-stack">
          <a
            className="drift-preview-link"
            href="https://trydriftfocus.vercel.app/"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Try Drift"
          >
            <article className="drift-screenshot-card">
              <Image
                src="/drift-full-preview.png"
                alt="Drift app landing page preview"
                width={3600}
                height={2088}
                priority
                unoptimized
                sizes="(max-width: 900px) calc(100vw - 56px), 760px"
                className="drift-full-preview"
              />
            </article>
          </a>
          <BackHome />
        </div>

        <div className="drift-info-stack">
          <a
            className="drift-info-card drift-cta-card px-panel"
            href="https://trydriftfocus.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            <h2 id="drift-preview-title" className="font-pixel drift-brick-title">
              Try Drift!
            </h2>
            <span className="drift-click-indicator" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </span>
          </a>

          <article className="drift-info-card px-panel">
            <h2 className="font-pixel drift-card-title">WHAT DRIFT DOES</h2>
            <p>
              Drift helps students understand whether their online time is actually focused. It tracks activity,
              blocks distracting sites, and turns study sessions into clear analytics about focus habits.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
