import type {
  AlbumPage,
  AppSettings,
  ArtistPage,
  BrowseItem,
  CsvImportResult,
  DownloadedItem,
  DownloadStatusInfo,
  HistoryItem,
  HomeSection,
  LikedSongItem,
  LocalPlaylist,
  LocalPlaylistDetail,
  Lyrics,
  QueueResult,
  RemotePlaylist,
  SearchHistoryEntry,
  SearchSummary,
  Song,
  StreamInfo,
} from "./types";

const API = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  search: (q: string, filter?: string) =>
    request<BrowseItem[]>(
      `/search?q=${encodeURIComponent(q)}${filter ? `&filter=${filter}` : ""}`,
    ),

  searchSummary: (q: string) =>
    request<SearchSummary>(`/search/summary?q=${encodeURIComponent(q)}`),

  getSuggestions: (q: string) =>
    request<{ suggestions: string[] }>(
      `/search/suggestions?q=${encodeURIComponent(q)}`,
    ).then((r) => r.suggestions),

  getSearchHistory: () => request<SearchHistoryEntry[]>("/search/history"),

  addSearchHistory: (query: string) =>
    request<void>("/search/history", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  deleteSearchHistoryItem: (id: number) =>
    request<void>(`/search/history/${id}`, { method: "DELETE" }),

  clearSearchHistory: () => request<void>("/search/history", { method: "DELETE" }),

  getHome: () => request<HomeSection[]>("/home"),

  getSong: (videoId: string) => request<Song>(`/song/${videoId}`),

  getStream: (videoId: string) => request<StreamInfo>(`/stream/${videoId}`),

  getRadioQueue: (videoId: string) =>
    request<QueueResult>(`/queue/${videoId}?radio=true`),

  getArtist: (channelId: string) => request<ArtistPage>(`/artist/${channelId}`),

  getAlbum: (browseId: string) => request<AlbumPage>(`/album/${browseId}`),

  getPlaylist: (playlistId: string) =>
    request<RemotePlaylist>(`/playlist/${playlistId}`),

  getLyrics: (track: string, artist: string, duration?: number) =>
    request<Lyrics>(
      `/lyrics?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(
        artist,
      )}${duration ? `&dur=${duration}` : ""}`,
    ),

  toggleLike: (song: Song) =>
    request<{ videoId: string; liked: boolean }>(
      `/library/like/${song.videoId}`,
      { method: "POST", body: JSON.stringify(song) },
    ),

  likeStatus: (videoId: string) =>
    request<{ videoId: string; liked: boolean }>(`/library/like/${videoId}`),

  getLiked: () => request<LikedSongItem[]>("/library/liked"),

  getHistory: (limit = 100) => request<HistoryItem[]>(`/history?limit=${limit}`),

  recordPlay: (song: Song, playTime = 0) =>
    request<void>(`/history/${song.videoId}`, {
      method: "POST",
      body: JSON.stringify({ song, playTime }),
    }),

  createPlaylist: (name: string) =>
    request<LocalPlaylist>("/library/playlists", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  importPlaylist: (playlistId: string) =>
    request<LocalPlaylist>("/library/playlists/import", {
      method: "POST",
      body: JSON.stringify({ playlistId }),
    }),

  importPlaylistCsv: async (file: File, name: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    const res = await fetch(`${API}/library/playlists/import-csv`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}: ${body}`);
    }
    return res.json() as Promise<CsvImportResult>;
  },

  syncPlaylist: (id: number) =>
    request<{ added: number; removed: number }>(
      `/library/playlists/${id}/sync`,
      { method: "POST" },
    ),

  getPlaylists: () => request<LocalPlaylist[]>("/library/playlists"),

  getLocalPlaylist: (id: number) =>
    request<LocalPlaylistDetail>(`/library/playlists/${id}`),

  addToPlaylist: (playlistId: number, song: Song) =>
    request<{ added: boolean }>(`/library/playlists/${playlistId}/songs`, {
      method: "POST",
      body: JSON.stringify(song),
    }),

  deletePlaylist: (id: number) =>
    request<void>(`/library/playlists/${id}`, { method: "DELETE" }),

  startDownload: (song: Song) =>
    request<DownloadStatusInfo>(`/downloads/${song.videoId}`, {
      method: "POST",
      body: JSON.stringify(song),
    }),

  getDownloads: () => request<DownloadedItem[]>("/downloads"),

  getDownloadStatus: (videoId: string) =>
    request<DownloadStatusInfo>(`/downloads/${videoId}/status`),

  deleteDownload: (videoId: string) =>
    request<void>(`/downloads/${videoId}`, { method: "DELETE" }),

  getSettings: () => request<AppSettings>("/settings"),

  patchSettings: (patch: Partial<AppSettings>) =>
    request<AppSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};
