"use client";

import { TransitionLink as Link } from "@/components/PageTransitions";
import { useEffect, useState } from "react";

export default function Resume() {
  const [isVisible, setIsVisible] = useState(false);

  // The PDF's onLoad usually fires quickly, but just in case it's slow (or
  // never fires for some reason), this guarantees the resume still fades
  // in after a short wait instead of the page looking permanently unfinished.
  useEffect(() => {
    const revealFallback = window.setTimeout(() => setIsVisible(true), 800);
    return () => window.clearTimeout(revealFallback);
  }, []);

  return (
    <div className="resume-page">
      <div className="resume-stage">
        <Link
          href="/"
          className="resume-side-back"
          aria-label="Back home"
          title="Back home"
        >
          <span aria-hidden>←</span>
          <span>back home</span>
        </Link>
        <div className="resume-document-wrap">
          {/* The <iframe> embeds the actual PDF; a full-shell <Link> sits on
              top so a click anywhere opens the dedicated full-screen viewer
              instead of fighting with the browser's built-in PDF controls. */}
          <div className={`resume-preview-shell${isVisible ? " is-visible" : ""}`}>
            <iframe
              className="resume-preview"
              src="/resume/resume.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH&pagemode=none"
              title="Xinge Xu's resume"
              tabIndex={-1}
              onLoad={() => setIsVisible(true)}
            />
            <Link
              href="/resume/editor"
              className="resume-preview-hit-area"
              aria-label="Open Xinge Xu's resume in the full PDF viewer"
              title="Open in the full PDF viewer"
            >
              <span className="resume-preview-label">Open in the full PDF viewer</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
