import { create } from "zustand";
import { api } from "../lib/api";
import type { DownloadedItem, Song } from "../lib/types";

type Status = "pending" | "downloading" | "done" | "error";

interface DownloadsState {
  items: DownloadedItem[];
  statuses: Record<string, Status>;
  refresh: () => Promise<void>;
  start: (song: Song) => Promise<void>;
  remove: (videoId: string) => Promise<void>;
}

let pollTimer: number | undefined;

function ensurePolling(get: () => DownloadsState) {
  if (pollTimer) return;
  pollTimer = window.setInterval(async () => {
    const { statuses } = get();
    const active = Object.entries(statuses).filter(
      ([, s]) => s === "pending" || s === "downloading",
    );
    if (active.length === 0) {
      window.clearInterval(pollTimer);
      pollTimer = undefined;
      return;
    }
    for (const [videoId] of active) {
      try {
        const status = await api.getDownloadStatus(videoId);
        useDownloads.setState((state) => ({
          statuses: { ...state.statuses, [videoId]: status.status },
        }));
        if (status.status === "done") void useDownloads.getState().refresh();
      } catch {
        // keep polling
      }
    }
  }, 3000);
}

export const useDownloads = create<DownloadsState>((set, get) => ({
  items: [],
  statuses: {},

  refresh: async () => {
    try {
      const items = await api.getDownloads();
      const statuses = { ...get().statuses };
      for (const item of items) statuses[item.song.videoId] = "done";
      set({ items, statuses });
    } catch {
      // backend offline; ignore
    }
  },

  start: async (song) => {
    set((s) => ({ statuses: { ...s.statuses, [song.videoId]: "downloading" } }));
    try {
      await api.startDownload(song);
      ensurePolling(get);
    } catch {
      set((s) => ({ statuses: { ...s.statuses, [song.videoId]: "error" } }));
    }
  },

  remove: async (videoId) => {
    await api.deleteDownload(videoId);
    set((s) => {
      const statuses = { ...s.statuses };
      delete statuses[videoId];
      return {
        items: s.items.filter((i) => i.song.videoId !== videoId),
        statuses,
      };
    });
  },
}));
