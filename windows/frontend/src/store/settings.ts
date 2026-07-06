import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";
import type { AppSettings } from "../lib/types";

export type AudioQuality = AppSettings["audioQuality"];

// Accent options from the design mockup. Each maps a hex + rgb triplet for glow.
export const ACCENTS: { hex: string; rgb: string }[] = [
  { hex: "#7c6fe0", rgb: "124 111 224" },
  { hex: "#e8564a", rgb: "232 86 74" },
  { hex: "#5ea9e8", rgb: "94 169 232" },
  { hex: "#5ee8b0", rgb: "94 232 176" },
];

interface SettingsState {
  volume: number; // 0..1
  muted: boolean;
  crossfade: boolean;
  crossfadeSec: number; // 0..12
  gapless: boolean;
  autoplay: boolean; // radio autofill on single-song play
  normalize: boolean;
  accent: string; // hex
  audioQuality: AudioQuality;

  setVolume: (v: number) => void;
  toggleMute: () => void;
  setMuted: (m: boolean) => void;
  setCrossfade: (v: boolean) => void;
  setCrossfadeSec: (s: number) => void;
  setGapless: (v: boolean) => void;
  setAutoplay: (v: boolean) => void;
  setNormalize: (v: boolean) => void;
  setAccent: (hex: string) => void;
  setAudioQuality: (q: AudioQuality) => void;
  loadServerSettings: () => Promise<void>;
  applyAccent: () => void;
}

function applyAccentVars(hex: string) {
  const match = ACCENTS.find((a) => a.hex === hex) ?? ACCENTS[0];
  const root = document.documentElement;
  root.style.setProperty("--color-primary", match.hex);
  root.style.setProperty("--glow-rgb", match.rgb);
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      volume: 0.8,
      muted: false,
      crossfade: false,
      crossfadeSec: 6,
      gapless: true,
      autoplay: true,
      normalize: false,
      accent: ACCENTS[0].hex,
      audioQuality: "auto",

      setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), muted: false }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setMuted: (m) => set({ muted: m }),
      setCrossfade: (v) => set({ crossfade: v }),
      setCrossfadeSec: (s) => set({ crossfadeSec: Math.min(12, Math.max(0, s)) }),
      setGapless: (v) => set({ gapless: v }),
      setAutoplay: (v) => set({ autoplay: v }),
      setNormalize: (v) => set({ normalize: v }),

      setAccent: (hex) => {
        set({ accent: hex });
        applyAccentVars(hex);
      },

      setAudioQuality: (q) => {
        set({ audioQuality: q });
        api.patchSettings({ audioQuality: q }).catch(() => {});
      },

      loadServerSettings: async () => {
        try {
          const s = await api.getSettings();
          set({ audioQuality: s.audioQuality });
        } catch {
          // backend offline; keep local
        }
      },

      applyAccent: () => applyAccentVars(get().accent),
    }),
    {
      name: "amphion-settings",
      onRehydrateStorage: () => (state) => {
        // Apply the persisted accent to CSS vars once hydrated.
        setTimeout(() => useSettings.getState().applyAccent(), 0);
        void state;
      },
    },
  ),
);
