let sharedAudioContext: AudioContext | null = null;

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

/** Reuses one browser audio context so mobile interactions unlock every sound. */
export function getSharedAudioContext() {
  if (typeof window === "undefined") return null;
  if (sharedAudioContext?.state === "closed") sharedAudioContext = null;
  if (sharedAudioContext) return sharedAudioContext;

  const AudioContextConstructor = window.AudioContext ||
    (window as WebkitAudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  try {
    sharedAudioContext = new AudioContextConstructor();
  } catch {
    sharedAudioContext = null;
  }
  return sharedAudioContext;
}

export function resumeSharedAudioContext(audio = getSharedAudioContext()) {
  if (audio && audio.state !== "running" && audio.state !== "closed") {
    void audio.resume().catch(() => undefined);
  }
  return audio;
}
