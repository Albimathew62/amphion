// Two-deck audio controller. Owns two <audio> elements (registered by AudioEngine)
// and drives crossfade / gapless / volume by animating each element's native
// `.volume` — which works on cross-origin (googlevideo) streams with no CORS taint,
// unlike the Web Audio API.

type Deck = HTMLAudioElement;

let deckA: Deck | null = null;
let deckB: Deck | null = null;
let activeIsA = true;

// Effective volume multipliers, recomputed whenever settings change.
let baseVolume = 0.8; // user volume 0..1
let muted = false;
let normA = 1; // per-track normalize multiplier for deck A
let normB = 1; // per-track normalize multiplier for deck B
let fadeMultA = 1; // crossfade envelope for deck A (0..1)
let fadeMultB = 1; // crossfade envelope for deck B

let fadeRaf = 0;

function active(): Deck | null {
  return activeIsA ? deckA : deckB;
}
function idle(): Deck | null {
  return activeIsA ? deckB : deckA;
}

function applyVolumes() {
  const g = muted ? 0 : baseVolume;
  if (deckA) deckA.volume = Math.min(1, Math.max(0, g * normA * fadeMultA));
  if (deckB) deckB.volume = Math.min(1, Math.max(0, g * normB * fadeMultB));
}

export const audio = {
  register(a: Deck | null, b: Deck | null) {
    deckA = a;
    deckB = b;
    applyVolumes();
  },

  get element(): Deck | null {
    return active();
  },

  get activeUrl(): string {
    return active()?.src ?? "";
  },

  // Hard-cut load onto the active deck (user-initiated play/skip).
  loadActive(url: string, opts?: { seekMs?: number; normalizeMult?: number }) {
    const el = active();
    if (!el) return;
    cancelFade();
    fadeMultA = 1;
    fadeMultB = 1;
    if (activeIsA) normA = opts?.normalizeMult ?? 1;
    else normB = opts?.normalizeMult ?? 1;
    // Silence the idle deck so a previously crossfading track can't be heard.
    const other = idle();
    if (other) {
      other.pause();
    }
    el.src = url;
    el.currentTime = 0;
    applyVolumes();
    void el.play().then(() => {
      if (opts?.seekMs) el.currentTime = opts.seekMs / 1000;
    }).catch(() => {});
  },

  // Preload the next track onto the idle deck without playing it.
  preloadIdle(url: string, normalizeMult: number) {
    const el = idle();
    if (!el) return;
    if (el.src !== url) {
      el.src = url;
      el.preload = "auto";
      try {
        el.load();
      } catch {
        /* ignore */
      }
    }
    if (activeIsA) normB = normalizeMult;
    else normA = normalizeMult;
  },

  // Equal-power crossfade from active → idle over `sec` seconds, then swap pointers.
  crossfadeToIdle(sec: number, onComplete: () => void) {
    const from = active();
    const to = idle();
    if (!from || !to) {
      onComplete();
      return;
    }
    cancelFade();
    // Start the incoming deck silent so both decks aren't briefly at full volume
    // before the first animation frame sets the fade envelope (audible double audio).
    if (activeIsA) fadeMultB = 0;
    else fadeMultA = 0;
    applyVolumes();
    to.currentTime = 0;
    void to.play().catch(() => {});
    const start = performance.now();
    const durMs = Math.max(200, sec * 1000);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durMs);
      const eq = Math.cos((t * Math.PI) / 2); // active fades out
      const eqIn = Math.cos(((1 - t) * Math.PI) / 2); // idle fades in
      if (activeIsA) {
        fadeMultA = eq;
        fadeMultB = eqIn;
      } else {
        fadeMultB = eq;
        fadeMultA = eqIn;
      }
      applyVolumes();
      if (t < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else {
        from.pause();
        activeIsA = !activeIsA;
        fadeMultA = 1;
        fadeMultB = 1;
        applyVolumes();
        onComplete();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  },

  // Instant gapless swap: play the preloaded idle deck and flip pointers.
  swapToIdle(onComplete: () => void) {
    const from = active();
    const to = idle();
    if (!to) {
      onComplete();
      return;
    }
    cancelFade();
    to.currentTime = 0;
    fadeMultA = 1;
    fadeMultB = 1;
    activeIsA = !activeIsA;
    applyVolumes();
    void to.play().catch(() => {});
    if (from) from.pause();
    onComplete();
  },

  play() {
    void active()?.play().catch(() => {});
  },
  pause() {
    active()?.pause();
  },
  toggle() {
    const el = active();
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  },
  seek(ms: number) {
    const el = active();
    if (el) el.currentTime = ms / 1000;
  },

  setVolume(v: number) {
    baseVolume = Math.min(1, Math.max(0, v));
    muted = false;
    applyVolumes();
  },
  setMuted(m: boolean) {
    muted = m;
    applyVolumes();
  },
  // Normalize multiplier for the currently-active deck.
  setActiveNormalize(mult: number) {
    if (activeIsA) normA = mult;
    else normB = mult;
    applyVolumes();
  },
};

function cancelFade() {
  if (fadeRaf) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
  }
}
