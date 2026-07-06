import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";
import { audio } from "../lib/audio";
import { useSettings } from "./settings";
import type { Song } from "../lib/types";

export type Repeat = "off" | "all" | "one";
export type PlayerPanel = "none" | "lyrics" | "queue";

interface PlayerState {
  current: Song | null;
  queue: Song[];
  queueIndex: number;
  baseQueue: Song[]; // pre-shuffle order
  streamUrl: string | null;
  loudness: number | null; // dB of current track, for normalization
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  liked: boolean;
  repeat: Repeat;
  shuffle: boolean;
  radioFilling: boolean;
  playerOpen: boolean;
  panel: PlayerPanel;
  restored: boolean; // hydrated from storage; stream not fetched yet

  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  playAt: (index: number) => void;
  next: () => void;
  prev: () => void;
  nextIndex: () => number | null; // index the engine will advance to, or null
  advanceViaEngine: (index: number, url: string, loudness: number | null) => void;
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  openPlayer: () => void;
  closePlayer: () => void;
  setPanel: (panel: PlayerPanel) => void;
  resumeRestored: () => Promise<void>;
  setIsPlaying: (playing: boolean) => void;
  setPosition: (ms: number) => void;
  setDuration: (ms: number) => void;
  toggleLike: () => Promise<void>;
  refreshStream: () => Promise<string | null>;
  onEnded: () => void;
}

async function fetchStreamFor(
  song: Song,
  get: () => PlayerState,
  set: (partial: Partial<PlayerState>) => void,
) {
  try {
    const [stream, likeStatus] = await Promise.all([
      api.getStream(song.videoId),
      api.likeStatus(song.videoId).catch(() => ({ liked: false })),
    ]);
    if (get().current?.videoId !== song.videoId) return;
    set({
      streamUrl: stream.url,
      loudness: stream.loudness ?? null,
      isLoading: false,
      liked: likeStatus.liked,
    });
    api.recordPlay(song).catch(() => {});
  } catch (e) {
    console.error("Stream fetch failed", e);
    if (get().current?.videoId === song.videoId) set({ isLoading: false });
  }
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      current: null,
      queue: [],
      queueIndex: -1,
      baseQueue: [],
      streamUrl: null,
      loudness: null,
      isPlaying: false,
      isLoading: false,
      positionMs: 0,
      durationMs: 0,
      liked: false,
      repeat: "off",
      shuffle: false,
      radioFilling: false,
      playerOpen: false,
      panel: "none",
      restored: false,

      playSong: async (song, queue) => {
        const q = queue ?? [song];
        const index = q.findIndex((s) => s.videoId === song.videoId);
        set({
          current: song,
          queue: q,
          baseQueue: q,
          queueIndex: index >= 0 ? index : 0,
          streamUrl: null,
          isLoading: true,
          isPlaying: false,
          positionMs: 0,
          durationMs: song.duration * 1000,
          restored: false,
        });
        await fetchStreamFor(song, get, set);

        // Radio autofill: single song → build an up-next queue (Android's YouTubeQueue)
        if (q.length <= 1 && useSettings.getState().autoplay) {
          set({ radioFilling: true });
          try {
            const radio = await api.getRadioQueue(song.videoId);
            const fresh = radio.items.filter((s) => s.videoId !== song.videoId);
            if (get().current?.videoId === song.videoId && fresh.length) {
              const newQueue = [song, ...fresh];
              set({ queue: newQueue, baseQueue: newQueue, queueIndex: 0 });
            }
          } catch {
            // radio is best-effort
          } finally {
            set({ radioFilling: false });
          }
        }
      },

      playAt: (index) => {
        const { queue } = get();
        const song = queue[index];
        if (!song) return;
        set({
          current: song,
          queueIndex: index,
          streamUrl: null,
          isLoading: true,
          isPlaying: false,
          positionMs: 0,
          durationMs: song.duration * 1000,
          restored: false,
        });
        void fetchStreamFor(song, get, set);
      },

      next: () => {
        const { queue, queueIndex, repeat, playAt } = get();
        if (queueIndex < queue.length - 1) {
          playAt(queueIndex + 1);
        } else if (repeat === "all" && queue.length > 0) {
          playAt(0);
        } else {
          set({ isPlaying: false });
        }
      },

      // The index automatic advance (crossfade/gapless/ended) will move to, or null.
      nextIndex: () => {
        const { queue, queueIndex, repeat } = get();
        if (repeat === "one") return queueIndex;
        if (queueIndex < queue.length - 1) return queueIndex + 1;
        if (repeat === "all" && queue.length > 0) return 0;
        return null;
      },

      // Engine already has the track playing on a deck — sync store state without
      // triggering a reload (AudioEngine guards on streamUrl match).
      advanceViaEngine: (index, url, loudness) => {
        const { queue } = get();
        const song = queue[index];
        if (!song) return;
        set({
          current: song,
          queueIndex: index,
          streamUrl: url,
          loudness,
          positionMs: 0,
          durationMs: song.duration * 1000,
          isPlaying: true,
          isLoading: false,
          restored: false,
        });
        api.recordPlay(song).catch(() => {});
        api
          .likeStatus(song.videoId)
          .then((r) => {
            if (get().current?.videoId === song.videoId) set({ liked: r.liked });
          })
          .catch(() => {});
      },

      prev: () => {
        const { queueIndex, positionMs, playAt } = get();
        if (positionMs > 3000 || queueIndex <= 0) {
          audio.seek(0);
          set({ positionMs: 0 });
        } else {
          playAt(queueIndex - 1);
        }
      },

      addToQueue: (song) => {
        const { queue, baseQueue } = get();
        if (queue.some((s) => s.videoId === song.videoId)) return;
        set({ queue: [...queue, song], baseQueue: [...baseQueue, song] });
      },

      playNext: (song) => {
        const { queue, queueIndex, baseQueue } = get();
        const filtered = queue.filter((s) => s.videoId !== song.videoId);
        const idx = Math.min(queueIndex + 1, filtered.length);
        const newQueue = [...filtered.slice(0, idx), song, ...filtered.slice(idx)];
        set({ queue: newQueue, baseQueue: [...baseQueue, song] });
      },

      removeFromQueue: (index) => {
        const { queue, queueIndex } = get();
        if (index === queueIndex) return; // don't remove the playing song
        const newQueue = queue.filter((_, i) => i !== index);
        set({
          queue: newQueue,
          queueIndex: index < queueIndex ? queueIndex - 1 : queueIndex,
        });
      },

      toggleShuffle: () => {
        const { shuffle, queue, baseQueue, queueIndex, current } = get();
        if (!current) {
          set({ shuffle: !shuffle });
          return;
        }
        if (!shuffle) {
          // shuffle the rest, keep current first
          const rest = queue.filter((_, i) => i !== queueIndex);
          for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
          }
          set({ shuffle: true, queue: [current, ...rest], queueIndex: 0 });
        } else {
          const idx = baseQueue.findIndex((s) => s.videoId === current.videoId);
          set({
            shuffle: false,
            queue: baseQueue,
            queueIndex: idx >= 0 ? idx : 0,
          });
        }
      },

      cycleRepeat: () => {
        const order: Repeat[] = ["off", "all", "one"];
        const { repeat } = get();
        set({ repeat: order[(order.indexOf(repeat) + 1) % order.length] });
      },

      openPlayer: () => set({ playerOpen: true }),
      closePlayer: () => set({ playerOpen: false, panel: "none" }),
      setPanel: (panel) => set({ panel }),

      resumeRestored: async () => {
        const { current, positionMs } = get();
        if (!current) return;
        set({ isLoading: true, restored: false });
        try {
          const stream = await api.getStream(current.videoId);
          if (get().current?.videoId !== current.videoId) return;
          set({ streamUrl: stream.url, loudness: stream.loudness ?? null, isLoading: false });
          // AudioEngine picks up the new src and plays; seek to saved position
          setTimeout(() => audio.seek(positionMs), 300);
        } catch {
          set({ isLoading: false });
        }
      },

      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setPosition: (positionMs) => set({ positionMs }),
      setDuration: (durationMs) => set({ durationMs }),

      toggleLike: async () => {
        const { current } = get();
        if (!current) return;
        const res = await api.toggleLike(current);
        set({ liked: res.liked });
      },

      refreshStream: async () => {
        const { current } = get();
        if (!current) return null;
        try {
          const stream = await api.getStream(current.videoId);
          set({ streamUrl: stream.url, loudness: stream.loudness ?? null });
          return stream.url;
        } catch {
          return null;
        }
      },

      onEnded: () => {
        const { repeat, next } = get();
        if (repeat === "one") {
          audio.seek(0);
          audio.play();
        } else {
          next();
        }
      },
    }),
    {
      name: "amphion-player",
      partialize: (s) => ({
        current: s.current,
        queue: s.queue,
        queueIndex: s.queueIndex,
        baseQueue: s.baseQueue,
        repeat: s.repeat,
        shuffle: s.shuffle,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.current) return;
        const duration = state.current.duration ?? 0;
        // Defer: localStorage hydration runs synchronously during create(),
        // before the usePlayer binding exists.
        setTimeout(() => {
          const savedPos = Number(localStorage.getItem("amphion-pos") ?? 0);
          usePlayer.setState({
            restored: true,
            isPlaying: false,
            streamUrl: null,
            positionMs: Number.isFinite(savedPos) ? savedPos : 0,
            durationMs: duration * 1000,
          });
        }, 0);
      },
    },
  ),
);
