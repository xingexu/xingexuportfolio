"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getSharedAudioContext, resumeSharedAudioContext } from "@/lib/audio";

const resumeFrames = Array.from(
  { length: 16 },
  (_, index) => `/resume-frames/frame-${String(index + 1).padStart(2, "0")}.png`,
);
const celebrationColors = [
  "var(--resume-confetti-1)",
  "var(--resume-confetti-2)",
  "var(--resume-confetti-3)",
  "var(--resume-confetti-4)",
  "var(--resume-confetti-5)",
];

async function playResumeCelebrationSound() {
  const audio = getSharedAudioContext();
  if (!audio || audio.state === "closed") return false;
  resumeSharedAudioContext(audio);
  if (audio.state !== "running") {
    try {
      await audio.resume();
    } catch {
      return false;
    }
  }
  if (audio.state !== "running") return false;

  const start = audio.currentTime + 0.025;
  const notes = [659.25, 783.99, 987.77, 1174.66, 1318.51];

  notes.forEach((frequency, index) => {
    const noteStart = start + index * 0.055;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = index % 2 === 0 ? "square" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.045, noteStart + 0.12);
    volume.gain.setValueAtTime(0.0001, noteStart);
    volume.gain.exponentialRampToValueAtTime(0.026, noteStart + 0.012);
    volume.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.18);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.2);
  });

  const noiseLength = Math.round(audio.sampleRate * 0.32);
  const noiseBuffer = audio.createBuffer(1, noiseLength, audio.sampleRate);
  const noise = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseLength; index += 1) {
    const fade = 1 - index / noiseLength;
    noise[index] = (Math.random() * 2 - 1) * fade;
  }

  const burst = audio.createBufferSource();
  const burstFilter = audio.createBiquadFilter();
  const burstVolume = audio.createGain();
  burst.buffer = noiseBuffer;
  burstFilter.type = "bandpass";
  burstFilter.frequency.setValueAtTime(2400, start);
  burstFilter.frequency.exponentialRampToValueAtTime(920, start + 0.28);
  burstFilter.Q.setValueAtTime(0.8, start);
  burstVolume.gain.setValueAtTime(0.0001, start);
  burstVolume.gain.exponentialRampToValueAtTime(0.042, start + 0.014);
  burstVolume.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
  burst.connect(burstFilter).connect(burstVolume).connect(audio.destination);
  burst.start(start);
  burst.stop(start + 0.32);
  return true;
}

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

const fallingParticles = Array.from({ length: 96 }, (_, index) => {
  const origin = perimeterOrigin(index, 8);
  const burst = outwardVector(index, origin.edge, 9, 72, 148);

  return {
    burstX: `${Math.round(burst.x)}px`,
    burstY: `${Math.round(burst.y)}px`,
    color: celebrationColors[Math.floor(seededUnit(index, 11) * celebrationColors.length)],
    delay: `${Math.round(seededUnit(index, 12) * 980)}ms`,
    drift: `${Math.round((seededUnit(index, 13) - 0.5) * 310)}px`,
    duration: `${2350 + Math.round(seededUnit(index, 14) * 2100)}ms`,
    isStar: index % 7 === 0 || index % 13 === 0,
    left: origin.left,
    size: 4 + Math.floor(seededUnit(index, 15) * 7),
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
  const loadedFrames = useRef(new Set<number>());
  const celebrationSoundPlayed = useRef(false);
  const celebrationSoundPending = useRef(false);
  const [activeFrame, setActiveFrame] = useState(0);
  const [loadedFrameVersion, setLoadedFrameVersion] = useState(0);

  useEffect(() => {
    const unlockAudio = () => resumeSharedAudioContext(getSharedAudioContext());
    window.addEventListener("pointerdown", unlockAudio, { capture: true, once: true, passive: true });
    window.addEventListener("keydown", unlockAudio, { capture: true, once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("keydown", unlockAudio, true);
    };
  }, []);

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

  useEffect(() => {
    if (activeFrame !== -1 || celebrationSoundPlayed.current) return;

    let cancelled = false;
    const tryCelebrationSound = () => {
      if (celebrationSoundPlayed.current || celebrationSoundPending.current) return;
      celebrationSoundPending.current = true;
      void playResumeCelebrationSound().then((played) => {
        if (cancelled) return;
        celebrationSoundPending.current = false;
        celebrationSoundPlayed.current = played;
      });
    };

    tryCelebrationSound();
    window.addEventListener("pointerdown", tryCelebrationSound, { capture: true, passive: true });
    window.addEventListener("keydown", tryCelebrationSound, { capture: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", tryCelebrationSound, true);
      window.removeEventListener("keydown", tryCelebrationSound, true);
    };
  }, [activeFrame]);

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
              {activeFrame >= 0
                ? [activeFrame, activeFrame + 1]
                    .filter((index) => index < resumeFrames.length)
                    .map((index) => (
                      <div
                        className={`resume-animation-frame${index === activeFrame ? " is-active" : ""}`}
                        key={resumeFrames[index]}
                        style={{
                          inset: 0,
                          position: "absolute",
                        }}
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
                className={`resume-falling-particle${particle.isStar ? " is-star" : ""}`}
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
