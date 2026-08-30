"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const resumeFrames = Array.from(
  { length: 16 },
  (_, index) => `/resume-frames/frame-${String(index + 1).padStart(2, "0")}.png`,
);
const celebrationColors = ["#ffffff", "#ffd24a", "#9fc4f0", "#6ecbff", "#ff8a3d"];

function seededUnit(index: number, salt: number) {
  let value = Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 1, 0x119de1f3);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

const resumeSparkles = Array.from({ length: 42 }, (_, index) => {
  const angle = (index / 42) * Math.PI * 2 + (seededUnit(index, 1) - 0.5) * 0.36;
  const radiusX = 48 + seededUnit(index, 2) * 118;
  const radiusY = 38 + seededUnit(index, 3) * 92;

  return {
    burstX: `${Math.round(Math.cos(angle) * radiusX)}px`,
    burstY: `${Math.round(Math.sin(angle) * radiusY)}px`,
    color: celebrationColors[Math.floor(seededUnit(index, 4) * celebrationColors.length)],
    delay: `${Math.round(seededUnit(index, 5) * 390)}ms`,
    drop: `${24 + Math.round(seededUnit(index, 6) * 64)}px`,
    duration: `${1080 + Math.round(seededUnit(index, 7) * 820)}ms`,
  };
});

const fallingParticles = Array.from({ length: 96 }, (_, index) => ({
  burstX: `${Math.round((seededUnit(index, 8) - 0.5) * 250)}px`,
  burstY: `${-42 - Math.round(seededUnit(index, 9) * 118)}px`,
  color: celebrationColors[Math.floor(seededUnit(index, 10) * celebrationColors.length)],
  delay: `${Math.round(seededUnit(index, 11) * 720)}ms`,
  drift: `${Math.round((seededUnit(index, 12) - 0.5) * 230)}px`,
  duration: `${2200 + Math.round(seededUnit(index, 13) * 1900)}ms`,
  isComet: index % 7 === 0 || index % 13 === 0,
  isStar: index % 6 === 0 || index % 17 === 0,
  left: `${43 + seededUnit(index, 14) * 14}%`,
  size: 3 + Math.floor(seededUnit(index, 15) * 10),
  spin: `${180 + Math.round(seededUnit(index, 16) * 900)}deg`,
  sway: `${Math.round((seededUnit(index, 17) - 0.5) * 180)}px`,
  top: `${31 + seededUnit(index, 18) * 20}%`,
}));

type SparkleStyle = CSSProperties & {
  "--sparkle-drop": string;
  "--sparkle-x": string;
  "--sparkle-y": string;
};

type FallingParticleStyle = CSSProperties & {
  "--particle-burst-x": string;
  "--particle-burst-y": string;
  "--particle-drift": string;
  "--particle-spin": string;
  "--particle-sway": string;
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
            {resumeSparkles.map((sparkle, index) => (
              <span
                className="resume-sparkle"
                key={index}
                style={
                  {
                    "--sparkle-drop": sparkle.drop,
                    "--sparkle-x": sparkle.burstX,
                    "--sparkle-y": sparkle.burstY,
                    animationDelay: sparkle.delay,
                    animationDuration: sparkle.duration,
                    color: sparkle.color,
                  } as SparkleStyle
                }
              />
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
            className={`resume-falling-particle${particle.isStar ? " is-star" : ""}${particle.isComet ? " is-comet" : ""}`}
            key={index}
            style={
              {
                "--particle-burst-x": particle.burstX,
                "--particle-burst-y": particle.burstY,
                "--particle-drift": particle.drift,
                "--particle-spin": particle.spin,
                "--particle-sway": particle.sway,
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
