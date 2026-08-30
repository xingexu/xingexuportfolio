"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const resumeFrames = Array.from(
  { length: 16 },
  (_, index) => `/resume-frames/frame-${String(index + 1).padStart(2, "0")}.png`,
);
const resumeSparkles = Array.from({ length: 14 }, (_, index) => index);
const celebrationColors = ["#ffffff", "#ffd24a", "#9fc4f0", "#6ecbff", "#ff8a3d"];
const fallingParticles = Array.from({ length: 36 }, (_, index) => ({
  burstX: `${((index * 41) % 150) - 75}px`,
  burstY: `${-28 - ((index * 19) % 72)}px`,
  color: celebrationColors[index % celebrationColors.length],
  delay: `${(index % 9) * 75 + Math.floor(index / 9) * 35}ms`,
  drift: `${((index * 67) % 300) - 150}px`,
  duration: `${1700 + ((index * 137) % 1100)}ms`,
  isStar: index % 5 === 0 || index % 11 === 0,
  left: `${4 + ((index * 29) % 92)}%`,
  size: 4 + ((index * 7) % 9),
  spin: `${180 + ((index * 113) % 720)}deg`,
  top: `${7 + ((index * 23) % 48)}%`,
}));

type FallingParticleStyle = CSSProperties & {
  "--particle-burst-x": string;
  "--particle-burst-y": string;
  "--particle-drift": string;
  "--particle-spin": string;
};

export default function Resume() {
  const loadedFrames = useRef(new Set<string>());
  const [animationReady, setAnimationReady] = useState(false);
  const [activeFrame, setActiveFrame] = useState(0);

  useEffect(() => {
    if (!animationReady) return;

    let nextFrame = 0;

    const playbackTimer = window.setInterval(() => {
      nextFrame += 1;

      if (nextFrame >= resumeFrames.length) {
        window.clearInterval(playbackTimer);
        setActiveFrame(-1);
        return;
      }

      setActiveFrame(nextFrame);
    }, 105);

    return () => window.clearInterval(playbackTimer);
  }, [animationReady]);

  function handleFrameLoad(src: string) {
    loadedFrames.current.add(src);

    if (loadedFrames.current.size === resumeFrames.length) {
      setAnimationReady(true);
    }
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
          <span>go back</span>
        </Link>
        <div className="resume-document-wrap">
          <div className="resume-preview-shell">
            <object
              className="resume-preview"
              data="/resume.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH&pagemode=none"
              type="application/pdf"
              aria-label="Xinge Xu's resume"
              tabIndex={-1}
            >
              <p>
                Your browser could not display the PDF. <a href="/resume.pdf">Open the resume</a>.
              </p>
            </object>
            <div className="resume-animation-frames" aria-hidden="true">
              {resumeFrames.map((src, index) => (
                <div
                  className={`resume-animation-frame${activeFrame === index ? " is-active" : ""}`}
                  key={src}
                  style={{
                    inset: 0,
                    position: "absolute",
                  }}
                >
                  <Image
                    className="resume-animation-image"
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 640px) calc(100vw - 32px), 900px"
                    loading="eager"
                    fetchPriority={index < 4 ? "high" : "auto"}
                    onLoad={() => handleFrameLoad(src)}
                  />
                </div>
              ))}
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
          <div
            className={`resume-sparkles${activeFrame === -1 ? " is-visible" : ""}`}
            aria-hidden="true"
          >
            {resumeSparkles.map((sparkle) => (
              <span className="resume-sparkle" key={sparkle} />
            ))}
          </div>
        </div>
      </div>
      <div
        className={`resume-celebration${activeFrame === -1 ? " is-visible" : ""}`}
        aria-hidden="true"
      >
        {fallingParticles.map((particle, index) => (
          <span
            className={`resume-falling-particle${particle.isStar ? " is-star" : ""}`}
            key={index}
            style={
              {
                "--particle-burst-x": particle.burstX,
                "--particle-burst-y": particle.burstY,
                "--particle-drift": particle.drift,
                "--particle-spin": particle.spin,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
                background: particle.color,
                color: particle.color,
                height: particle.size,
                left: particle.left,
                top: particle.top,
                width: particle.size,
              } as FallingParticleStyle
            }
          />
        ))}
      </div>
    </div>
  );
}
