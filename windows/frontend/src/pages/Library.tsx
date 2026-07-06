import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { LocalPlaylist, Song } from "../lib/types";
import Chip from "../components/Chip";
import Icon from "../components/Icon";
import SongListRow from "../components/SongListRow";
import { useDownloads } from "../store/downloads";

type Tab = "playlists" | "downloads";

interface OpenPlaylist {
  id: number;
  name: string;
  browseId?: string | null;
  songs: Song[];
}

export default function Library() {
  const [tab, setTab] = useState<Tab>("playlists");
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>([]);
  const [openPlaylist, setOpenPlaylist] = useState<OpenPlaylist | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [params, setParams] = useSearchParams();
  const downloads = useDownloads((s) => s.items);
  const refreshDownloads = useDownloads((s) => s.refresh);
  const removeDownload = useDownloads((s) => s.remove);

  const reload = useCallback(() => {
    api.getPlaylists().then(setPlaylists).catch(() => {});
    void refreshDownloads();
  }, [refreshDownloads]);

  useEffect(reload, [reload]);

  const showPlaylist = useCallback(async (id: number) => {
    const detail = await api.getLocalPlaylist(id);
    setTab("playlists");
    setOpenPlaylist({
      id: detail.id,
      name: detail.name,
      browseId: detail.browseId,
      songs: detail.songs,
    });
  }, []);

  // Open a playlist when navigated from the sidebar (?playlist=ID).
  useEffect(() => {
    const pid = params.get("playlist");
    if (pid) {
      void showPlaylist(Number(pid));
      params.delete("playlist");
      setParams(params, { replace: true });
    }
  }, [params, setParams, showPlaylist]);

  const downloadQueue = downloads.map((d) => d.song);

  const createPlaylist = async () => {
    const name = window.prompt("Playlist name");
    if (!name?.trim()) return;
    await api.createPlaylist(name.trim());
    reload();
  };

  const syncOpenPlaylist = async () => {
    if (!openPlaylist?.browseId) return;
    setSyncing(true);
    try {
      await api.syncPlaylist(openPlaylist.id);
      await showPlaylist(openPlaylist.id);
    } finally {
      setSyncing(false);
    }
  };

  // Playlist detail view
  if (openPlaylist) {
    return (
      <div className="mx-auto max-w-4xl px-9 py-9">
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => setOpenPlaylist(null)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container-high"
            title="Back"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">
            {openPlaylist.name}
          </h1>
          {openPlaylist.browseId && (
            <button
              onClick={() => void syncOpenPlaylist()}
              disabled={syncing}
              className="flex h-9 items-center gap-2 rounded-full bg-surface-container-high px-4 text-xs font-medium hover:bg-surface-container-highest disabled:opacity-50"
            >
              <Icon
                name={syncing ? "progress_activity" : "sync"}
                size={16}
                className={syncing ? "animate-spin" : ""}
              />
              Sync
            </button>
          )}
        </div>
        {openPlaylist.songs.length === 0 ? (
          <p className="text-sm text-on-surface-variant">This playlist is empty.</p>
        ) : (
          <div className="space-y-0.5">
            {openPlaylist.songs.map((s, i) => (
              <SongListRow key={s.videoId} song={s} queue={openPlaylist.songs} index={i} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-9 py-9">
      <h1 className="mb-6 text-2xl font-bold">Your Library</h1>
      <div className="mb-7 flex gap-2">
        <Chip
          label="Playlists"
          selected={tab === "playlists"}
          onClick={() => setTab("playlists")}
        />
        <Chip
          label="Downloads"
          selected={tab === "downloads"}
          onClick={() => setTab("downloads")}
        />
      </div>

      {tab === "playlists" && (
        <>
          <button
            onClick={() => void createPlaylist()}
            className="mb-5 flex h-9 items-center gap-2 rounded-full bg-surface-container-high px-4 text-xs font-medium hover:bg-surface-container-highest"
          >
            <Icon name="add" size={16} />
            New playlist
          </button>
          {playlists.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No playlists yet. Create one, or import from YouTube Music in Settings.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void showPlaylist(p.id)}
                  className="rounded-xl bg-surface-container p-3.5 text-left transition-colors hover:bg-surface-container-high"
                >
                  <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-lg bg-gradient-to-br from-primary-container to-surface-container-highest">
                    <Icon
                      name={p.browseId ? "cloud_sync" : "queue_music"}
                      size={34}
                      className="text-on-surface-variant"
                    />
                  </div>
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-on-surface-variant">
                    {p.songCount} songs{p.browseId ? " · YT Music" : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "downloads" && (
        <div className="max-w-3xl space-y-0.5">
          {downloads.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
              <Icon name="download" size={48} className="opacity-40" />
              <p className="text-sm">
                No downloads yet. Use the download button in a song's menu or the player.
              </p>
            </div>
          )}
          {downloads.map((item) => (
            <div key={item.song.videoId} className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <SongListRow song={item.song} queue={downloadQueue} />
              </div>
              <button
                onClick={() => void removeDownload(item.song.videoId)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-error"
                title="Remove download"
              >
                <Icon name="delete" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
