import Image from "next/image";
import BackHome from "@/components/BackHome";
import GithubActivity from "@/components/GithubActivity";
import { LINKS } from "@/app/data";
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

      <section className="drift-showcase" aria-labelledby="photogit-preview-title" style={{ marginBottom: 56 }}>
        <div className="drift-preview-stack">
          <a
            className="drift-preview-link"
            href="https://photogit-three.vercel.app/"
            target="_blank"
            rel="noreferrer"
            aria-label="Open PhotoGit"
          >
            <article className="drift-screenshot-card">
              <Image
                src="/images/photogit-preview.png"
                alt="PhotoGit app landing page preview"
                width={1728}
                height={1000}
                priority
                unoptimized
                sizes="(max-width: 900px) calc(100vw - 56px), 760px"
                className="drift-full-preview"
              />
            </article>
          </a>
        </div>

        <div className="drift-info-stack">
          <a
            className="drift-info-card drift-cta-card px-panel"
            href="https://photogit-three.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            <h2 id="photogit-preview-title" className="font-pixel drift-brick-title">
              Try PhotoGit!
            </h2>
            <span className="drift-click-indicator" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </span>
          </a>

          <article className="drift-info-card px-panel">
            <div className="drift-card-heading">
              <time className="font-pixel drift-card-date" dateTime="2026-09">
                — September 2026
              </time>
              <h2 className="font-pixel drift-card-title">ABOUT</h2>
            </div>
            <p>
              PhotoGit is git for Photoshop — version control for your PSDs. Commit edits, branch off a layout, and
              roll back to any past version without ever flattening or losing a layer.
            </p>
          </article>
        </div>
      </section>

      <section className="drift-showcase" aria-labelledby="drift-preview-title" style={{ marginBottom: 56 }}>
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
                src="/images/drift-full-preview.png"
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
            <div className="drift-card-heading">
              <time className="font-pixel drift-card-date" dateTime="2026-07">
                — July 2026
              </time>
              <h2 className="font-pixel drift-card-title">ABOUT</h2>
            </div>
            <p>
              Drift is my first macOS app. It helps students understand their online focus through activity tracking,
              website blocking, and clear study-session insights.
            </p>
          </article>
        </div>
      </section>

      <GithubActivity username="xingexu" profileUrl={LINKS.github} />

      <div style={{ marginTop: 40 }}>
        <BackHome />
      </div>
    </div>
  );
}
