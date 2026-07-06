import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { AlbumPage } from "../lib/types";
import { formatDuration } from "../lib/types";
import { hqThumbnail } from "../lib/image";
import Icon from "../components/Icon";
import SongListRow from "../components/SongListRow";
import Thumbnail from "../components/Thumbnail";
import { usePlayer } from "../store/player";

export default function Album() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const playSong = usePlayer((s) => s.playSong);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const shuffle = usePlayer((s) => s.shuffle);

  useEffect(() => {
    if (!id) return;
    setStatus("loading");
    setAlbum(null);
    api
      .getAlbum(id)
      .then((a) => {
        setAlbum(a);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  if (status === "loading")
    return (
      <div className="flex items-center gap-3 px-9 py-9 text-on-surface-variant">
        <Icon name="progress_activity" size={20} className="animate-spin" />
        <span className="text-sm">Loading album…</span>
      </div>
    );
  if (status === "error" || !album)
    return <p className="px-9 py-9 text-on-surface-variant">Couldn't load this album.</p>;

  const totalSeconds = album.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const meta = [
    album.artist,
    album.year?.toString(),
    `${album.songs.length} songs`,
    formatDuration(totalSeconds),
  ]
    .filter(Boolean)
    .join(" · ");

  const playAll = () => {
    if (album.songs.length) void playSong(album.songs[0], album.songs);
  };

  const shuffleAll = () => {
    if (!album.songs.length) return;
    const start = album.songs[Math.floor(Math.random() * album.songs.length)];
    void playSong(start, album.songs).then(() => {
      if (!shuffle) toggleShuffle();
    });
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
            src={hqThumbnail(album.thumbnailUrl)}
            className="h-full w-full object-cover"
            icon="album"
            iconSize={48}
            iconClassName="text-white/40"
          />
        </div>
        <div className="min-w-0 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Album
          </p>
          <h1 className="mt-2 truncate text-5xl font-bold leading-none text-white">
            {album.title}
          </h1>
          <p className="mt-3 truncate text-sm text-white/70">{meta}</p>
        </div>
      </div>

      <div className="px-9 pb-10 pt-5">
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={playAll}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary transition-transform hover:scale-105"
            title="Play"
          >
            <Icon name="play_arrow" filled size={24} />
          </button>
          <button
            onClick={shuffleAll}
            className="flex h-10 items-center gap-2 rounded-full bg-surface-container-high px-5 text-sm font-medium hover:bg-surface-container-highest"
          >
            <Icon name="shuffle" size={18} />
            Shuffle
          </button>
        </div>

        <div className="space-y-0.5">
          {album.songs.map((song, i) => (
            <SongListRow key={song.videoId} song={song} queue={album.songs} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
