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

function perimeterOrigin(index: number, salt: number) {
  const edge = index % 4;
  const along = 5 + seededUnit(index, salt) * 90;

  if (edge === 0) return { edge, left: `${along}%`, top: "0%" };
  if (edge === 1) return { edge, left: "100%", top: `${along}%` };
  if (edge === 2) return { edge, left: `${along}%`, top: "100%" };
  return { edge, left: "0%", top: `${along}%` };
}

function outwardVector(index: number, edge: number, salt: number, min: number, range: number) {
  const distance = min + seededUnit(index, salt) * range;
  const tangent = (seededUnit(index, salt + 1) - 0.5) * distance * 0.95;

  if (edge === 0) return { x: tangent, y: -distance };
  if (edge === 1) return { x: distance, y: tangent };
  if (edge === 2) return { x: tangent, y: distance };
  return { x: -distance, y: tangent };
}

const resumeSparkles = Array.from({ length: 52 }, (_, index) => {
  const origin = perimeterOrigin(index, 1);
  const burst = outwardVector(index, origin.edge, 2, 52, 126);

  return {
    burstX: `${Math.round(burst.x)}px`,
    burstY: `${Math.round(burst.y)}px`,
    color: celebrationColors[Math.floor(seededUnit(index, 4) * celebrationColors.length)],
    delay: `${Math.round(seededUnit(index, 5) * 520)}ms`,
    drop: `${32 + Math.round(seededUnit(index, 6) * 82)}px`,
    duration: `${1180 + Math.round(seededUnit(index, 7) * 920)}ms`,
    left: origin.left,
    top: origin.top,
  };
});

const fallingParticles = Array.from({ length: 112 }, (_, index) => {
  const origin = perimeterOrigin(index, 8);
  const burst = outwardVector(index, origin.edge, 9, 72, 148);

  return {
    burstX: `${Math.round(burst.x)}px`,
    burstY: `${Math.round(burst.y)}px`,
    color: celebrationColors[Math.floor(seededUnit(index, 11) * celebrationColors.length)],
    delay: `${Math.round(seededUnit(index, 12) * 980)}ms`,
    drift: `${Math.round((seededUnit(index, 13) - 0.5) * 310)}px`,
    duration: `${2350 + Math.round(seededUnit(index, 14) * 2100)}ms`,
    isComet: index % 5 === 0 || index % 11 === 0,
    isStar: index % 5 === 0 || index % 13 === 0,
    left: origin.left,
    size: 5 + Math.floor(seededUnit(index, 15) * 11),
    spin: `${240 + Math.round(seededUnit(index, 16) * 1080)}deg`,
    sway: `${Math.round((seededUnit(index, 17) - 0.5) * 230)}px`,
    top: origin.top,
  };
});

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
                    left: sparkle.left,
                    top: sparkle.top,
                  } as SparkleStyle
                }
              />
            ))}
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
      </div>
    </div>
  );
}
