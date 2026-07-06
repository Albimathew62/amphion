import type { Song } from "../lib/types";
import { usePlayer } from "../store/player";
import Icon from "./Icon";
import Thumbnail from "./Thumbnail";

interface Props {
  song: Song;
  queue?: Song[];
}

// Compact row-style card for song grids (e.g. Home's "Recommended for you") —
// small square thumbnail + title/artist beside it, as opposed to MediaCard's
// large square artwork used for albums/playlists/recently-played.
export default function CompactTrackCard({ song, queue }: Props) {
  const playSong = usePlayer((s) => s.playSong);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isCurrent = current?.videoId === song.videoId;

  return (
    <button
      onClick={() => void playSong(song, queue)}
      className={`group flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
        isCurrent ? "bg-surface-container-high" : "bg-surface-container hover:bg-surface-container-high"
      }`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-container-highest">
        <Thumbnail src={song.thumbnailUrl} className="h-full w-full object-cover" iconSize={22} />
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity ${
            isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Icon
            name={isCurrent && isPlaying ? "pause" : "play_arrow"}
            filled
            size={20}
            className="text-white"
          />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[13.5px] font-medium ${isCurrent ? "text-primary" : "text-on-surface"}`}
        >
          {song.title}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-on-surface-variant">
          {song.artist}
        </div>
      </div>
    </button>
  );
}
