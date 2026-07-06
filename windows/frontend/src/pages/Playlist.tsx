import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { RemotePlaylist } from "../lib/types";
import { hqThumbnail } from "../lib/image";
import Icon from "../components/Icon";
import SongListRow from "../components/SongListRow";
import Thumbnail from "../components/Thumbnail";
import { usePlayer } from "../store/player";

export default function Playlist() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<RemotePlaylist | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [imported, setImported] = useState(false);
  const playSong = usePlayer((s) => s.playSong);

  useEffect(() => {
    if (!id) return;
    setStatus("loading");
    setImported(false);
    api
      .getPlaylist(id)
      .then((p) => {
        setPlaylist(p);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  if (status === "loading")
    return (
      <div className="flex items-center gap-3 px-9 py-9 text-on-surface-variant">
        <Icon name="progress_activity" size={20} className="animate-spin" />
        <span className="text-sm">Loading playlist…</span>
      </div>
    );
  if (status === "error" || !playlist)
    return (
      <p className="px-9 py-9 text-on-surface-variant">Couldn't load this playlist.</p>
    );

  const saveToLibrary = async () => {
    if (!id || imported) return;
    try {
      await api.importPlaylist(id);
      setImported(true);
    } catch {
      // leave button enabled on failure
    }
  };

  return (
    <div>
      <div
        className="flex items-end gap-6 px-9 pb-7 pt-11"
        style={{
          background:
            "linear-gradient(160deg,#3a2f6e 0%,#221d3f 55%,#0d0d0d 100%)",
        }}
      >
        <div className="h-44 w-44 shrink-0 overflow-hidden rounded-xl bg-surface-container-high elevate-2">
          <Thumbnail
            src={hqThumbnail(playlist.thumbnailUrl)}
            className="h-full w-full object-cover"
            icon="queue_music"
            iconSize={48}
            iconClassName="text-white/40"
          />
        </div>
        <div className="min-w-0 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Playlist
          </p>
          <h1 className="mt-2 truncate text-5xl font-bold leading-none text-white">
            {playlist.title}
          </h1>
          <p className="mt-3 truncate text-sm text-white/70">
            {[playlist.author, `${playlist.songs.length} songs`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="px-9 pb-10 pt-5">
        <div className="mb-5 flex items-center gap-3">
          {playlist.songs.length > 0 && (
            <button
              onClick={() => void playSong(playlist.songs[0], playlist.songs)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary transition-transform hover:scale-105"
              title="Play"
            >
              <Icon name="play_arrow" filled size={24} />
            </button>
          )}
          <button
            onClick={() => void saveToLibrary()}
            disabled={imported}
            className="flex h-10 items-center gap-2 rounded-full bg-surface-container-high px-5 text-sm font-medium hover:bg-surface-container-highest disabled:opacity-60"
          >
            <Icon name={imported ? "library_add_check" : "library_add"} size={18} />
            {imported ? "Saved" : "Save to library"}
          </button>
        </div>

        <div className="space-y-0.5">
          {playlist.songs.map((s, i) => (
            <SongListRow
              key={`${s.videoId}-${i}`}
              song={s}
              queue={playlist.songs}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
