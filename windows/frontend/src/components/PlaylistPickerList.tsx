import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { LocalPlaylist, Song } from "../lib/types";
import Icon from "./Icon";

interface Props {
  song: Song;
  onDone: () => void; // called after a successful add (or create+add)
}

// Shared playlist picker body: a "New playlist" row + one row per playlist.
// Used by both the song context menu (SongMenu) and the full-player button
// (AddToPlaylistButton). Fetches playlists on mount. Lists all playlists (adding
// only touches the local copy; it does not push upstream to YouTube Music).
export default function PlaylistPickerList({ song, onDone }: Props) {
  const [playlists, setPlaylists] = useState<LocalPlaylist[] | null>(null);
  const [busy, setBusy] = useState<number | "new" | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPlaylists()
      .then((p) => {
        if (!cancelled) setPlaylists(p);
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addToPlaylist = async (playlistId: number) => {
    setBusy(playlistId);
    try {
      await api.addToPlaylist(playlistId, song);
    } catch {
      /* best effort */
    } finally {
      setBusy(null);
      onDone();
    }
  };

  const createAndAdd = async () => {
    const name = window.prompt("New playlist name");
    if (!name?.trim()) return;
    setBusy("new");
    try {
      const pl = await api.createPlaylist(name.trim());
      await api.addToPlaylist(pl.id, song);
    } catch {
      /* best effort */
    } finally {
      setBusy(null);
      onDone();
    }
  };

  return (
    <div className="max-h-64 overflow-y-auto">
      <button
        onClick={(e) => {
          e.stopPropagation();
          void createAndAdd();
        }}
        disabled={busy !== null}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-surface-container-highest disabled:opacity-50"
      >
        <Icon
          name={busy === "new" ? "progress_activity" : "add"}
          size={18}
          className={`text-on-surface-variant ${busy === "new" ? "animate-spin" : ""}`}
        />
        New playlist
      </button>
      {playlists === null && (
        <div className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-on-surface-variant">
          <Icon name="progress_activity" size={18} className="animate-spin" />
          Loading…
        </div>
      )}
      {playlists?.length === 0 && (
        <div className="px-3.5 py-2.5 text-sm text-on-surface-variant/70">
          No playlists yet.
        </div>
      )}
      {playlists?.map((p) => (
        <button
          key={p.id}
          onClick={(e) => {
            e.stopPropagation();
            void addToPlaylist(p.id);
          }}
          disabled={busy !== null}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-surface-container-highest disabled:opacity-50"
        >
          <Icon
            name={busy === p.id ? "progress_activity" : p.browseId ? "cloud_sync" : "queue_music"}
            size={18}
            className={`text-on-surface-variant ${busy === p.id ? "animate-spin" : ""}`}
          />
          <span className="min-w-0 flex-1 truncate">{p.name}</span>
        </button>
      ))}
    </div>
  );
}
