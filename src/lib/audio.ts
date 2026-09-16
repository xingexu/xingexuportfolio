// Keep a single AudioContext around for the whole page. Browsers only let you
// create/unlock so many of these, and Safari in particular gets grumpy if you
// spin up a fresh one for every little sound effect.
let sharedAudioContext: AudioContext | null = null;

// Older Safari/WebKit still expects the vendor-prefixed name, so we humor it.
type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

/** Reuses one browser audio context so mobile interactions unlock every sound. */
export function getSharedAudioContext() {
  if (typeof window === "undefined") return null;
  // A closed context is dead for good — throw it away and make a new one.
  if (sharedAudioContext?.state === "closed") sharedAudioContext = null;
  if (sharedAudioContext) return sharedAudioContext;

  const AudioContextConstructor = window.AudioContext ||
    (window as WebkitAudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  try {
    sharedAudioContext = new AudioContextConstructor();
  } catch {
    // Some browsers throw if audio is blocked entirely — just fail quietly.
    sharedAudioContext = null;
  }
  return sharedAudioContext;
}

// Mobile browsers start every AudioContext "suspended" until a real user
// gesture (tap/click) comes through, so we nudge it awake here.
export function resumeSharedAudioContext(audio = getSharedAudioContext()) {
  if (audio && audio.state !== "running" && audio.state !== "closed") {
    void audio.resume().catch(() => undefined);
  }
  return audio;
}
