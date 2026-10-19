"use client";

import Image from "next/image";
import { TransitionLink as Link } from "@/components/PageTransitions";
import { useEffect, useRef, useState } from "react";

// Sixteen pre-rendered stills of the resume, from chunky pixels to sharp.
// Played in order over a white page, they make the resume "develop" into
// view before handing off to the real PDF underneath.
const resumeFrames = Array.from(
  { length: 16 },
  (_, index) => `/resume/frames/frame-${String(index + 1).padStart(2, "0")}.png`,
);

export default function Resume() {
  const loadedFrames = useRef(new Set<number>());
  // -1 means the reveal has finished and the frames are unmounted.
  const [activeFrame, setActiveFrame] = useState(0);
  const [loadedFrameVersion, setLoadedFrameVersion] = useState(0);

  // Step to the next frame only once the current one (and the one after it)
  // has loaded, so a slow connection pauses the reveal instead of flashing
  // blank frames.
  useEffect(() => {
    if (activeFrame < 0 || !loadedFrames.current.has(activeFrame)) return;

    const nextFrame = activeFrame + 1;
    if (nextFrame < resumeFrames.length && !loadedFrames.current.has(nextFrame)) return;

    const playbackTimer = window.setTimeout(() => {
      setActiveFrame((currentFrame) =>
        currentFrame + 1 >= resumeFrames.length ? -1 : currentFrame + 1,
      );
    }, 105);

    return () => window.clearTimeout(playbackTimer);
  }, [activeFrame, loadedFrameVersion]);

  function handleFrameLoad(index: number) {
    if (loadedFrames.current.has(index)) return;
    loadedFrames.current.add(index);
    setLoadedFrameVersion((version) => version + 1);
  }

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
          <div className="resume-preview-shell">
            <iframe
              className="resume-preview"
              src="/resume/resume.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH&pagemode=none"
              title="Xinge Xu's resume"
              tabIndex={-1}
            />
            <div className="resume-animation-frames" aria-hidden="true">
              {activeFrame >= 0
                ? [activeFrame, activeFrame + 1]
                    .filter((index) => index < resumeFrames.length)
                    .map((index) => (
                      <div
                        className={`resume-animation-frame${index === activeFrame ? " is-active" : ""}`}
                        key={resumeFrames[index]}
                      >
                        <Image
                          className="resume-animation-image"
                          src={resumeFrames[index]}
                          alt=""
                          fill
                          sizes="(max-width: 820px) 88vw, 900px"
                          loading="eager"
                          fetchPriority={index === activeFrame && index < 4 ? "high" : "auto"}
                          onLoad={() => handleFrameLoad(index)}
                          onError={() => handleFrameLoad(index)}
                        />
                      </div>
                    ))
                : null}
            </div>
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
