import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { LikedSongItem, Song } from "../lib/types";
import { formatDuration } from "../lib/types";
import Icon from "../components/Icon";
import SongListRow from "../components/SongListRow";
import { usePlayer } from "../store/player";

export default function Liked() {
  const [liked, setLiked] = useState<LikedSongItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const playSong = usePlayer((s) => s.playSong);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const shuffle = usePlayer((s) => s.shuffle);

  useEffect(() => {
    api
      .getLiked()
      .then(setLiked)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const songs: Song[] = liked.map((l) => l.song);
  const totalSec = songs.reduce((a, s) => a + (s.duration || 0), 0);

  const playAll = () => songs.length && void playSong(songs[0], songs);
  const shuffleAll = () => {
    if (!songs.length) return;
    const start = songs[Math.floor(Math.random() * songs.length)];
    void playSong(start, songs).then(() => {
      if (!shuffle) toggleShuffle();
    });
  };

  return (
    <div>
      <div
        className="flex items-end gap-6 px-9 pb-7 pt-11"
        style={{
          background:
            "linear-gradient(160deg,#4b3f9e 0%,#241f4a 55%,#0d0d0d 100%)",
        }}
      >
        <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8a7ee6] to-[#4b3f9e] elevate-2">
          <Icon name="favorite" filled size={60} className="text-white" />
        </div>
        <div className="pb-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Playlist
          </div>
          <h1 className="mt-2 text-5xl font-bold leading-none text-white">
            Liked Songs
          </h1>
          <div className="mt-3 text-sm text-white/70">
            {songs.length} songs · {formatDuration(totalSec)}
          </div>
        </div>
      </div>

      <div className="px-9 pb-10 pt-5">
        {songs.length > 0 && (
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
        )}

        {loaded && songs.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
            <Icon name="favorite" size={48} className="opacity-40" />
            <p className="text-sm">No liked songs yet — hit the heart on any track.</p>
          </div>
        )}

        <div className="space-y-0.5">
          {songs.map((s, i) => (
            <SongListRow key={s.videoId} song={s} queue={songs} index={i} liked />
          ))}
        </div>
      </div>
    </div>
  );
}
