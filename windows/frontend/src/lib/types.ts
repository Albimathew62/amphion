export interface Song {
  videoId: string;
  title: string;
  artist: string;
  album?: string | null;
  thumbnailUrl?: string | null;
  duration: number; // seconds
}

export interface BrowseItem {
  type: "song" | "video" | "album" | "playlist" | "artist";
  videoId?: string | null;
  browseId?: string | null;
  playlistId?: string | null;
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  duration: number;
}

export interface HomeSection {
  title: string;
  items: BrowseItem[];
}

export interface SearchSection {
  title: string;
  items: BrowseItem[];
}

export interface SearchSummary {
  sections: SearchSection[];
}

export interface SearchHistoryEntry {
  id: number;
  query: string;
  createdAt: string;
}

export interface StreamInfo {
  videoId: string;
  url: string;
  expiresAt: number; // unix seconds
  local?: boolean;
  loudness?: number | null;
}

export interface LyricsLine {
  timeMs: number;
  text: string;
}

export interface Lyrics {
  synced: boolean;
  lines?: LyricsLine[] | null;
  plain?: string | null;
}

export interface RemotePlaylist {
  id: string;
  title: string;
  author?: string | null;
  thumbnailUrl?: string | null;
  songs: Song[];
}

export interface QueueResult {
  playlistId?: string | null;
  items: Song[];
}

export interface ArtistPage {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  sections: { title: string; items: BrowseItem[] }[];
}

export interface AlbumPage {
  id: string;
  title: string;
  year?: number | null;
  thumbnailUrl?: string | null;
  playlistId?: string | null;
  artist?: string | null;
  songs: Song[];
}

export interface LikedSongItem {
  song: Song;
  likedAt: string;
}

export interface HistoryItem {
  song: Song;
  playedAt: string;
}

export interface LocalPlaylist {
  id: number;
  name: string;
  createdAt: string;
  songCount: number;
  browseId?: string | null;
}

export interface LocalPlaylistDetail {
  id: number;
  name: string;
  createdAt: string;
  browseId?: string | null;
  songs: Song[];
}

export interface CsvImportResult {
  playlist: LocalPlaylist;
  total: number;
  success: number;
  failed: number;
  failedTitles: string[];
}

export interface DownloadStatusInfo {
  videoId: string;
  status: "pending" | "downloading" | "done" | "error";
  progress: number;
  error?: string | null;
}

export interface DownloadedItem {
  song: Song;
  dateDownload: string;
}

export interface AppSettings {
  audioQuality: "auto" | "low" | "high" | "highest";
}

export function browseItemToSong(item: BrowseItem): Song | null {
  if (!item.videoId) return null;
  return {
    videoId: item.videoId,
    title: item.title,
    artist: item.subtitle ?? "",
    thumbnailUrl: item.thumbnailUrl,
    duration: item.duration,
  };
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
