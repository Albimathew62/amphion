import type { Song } from "../lib/types";
import { formatDuration } from "../lib/types";
import { usePlayer } from "../store/player";
import { useDownloads } from "../store/downloads";
import Icon from "./Icon";
import SongMenu from "./SongMenu";
import Thumbnail from "./Thumbnail";

interface Props {
  song: Song;
  queue?: Song[];
  index?: number; // show track number instead of thumbnail (album view)
  trailing?: string;
  liked?: boolean;
}

export default function SongListRow({ song, queue, index, trailing, liked }: Props) {
  const playSong = usePlayer((s) => s.playSong);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const statuses = useDownloads((s) => s.statuses);
  const isCurrent = current?.videoId === song.videoId;
  const downloaded = statuses[song.videoId] === "done";
  const downloading =
    statuses[song.videoId] === "downloading" || statuses[song.videoId] === "pending";

  const subtitleParts = [
    song.artist,
    trailing ?? (song.duration > 0 ? formatDuration(song.duration) : ""),
  ].filter(Boolean);

  return (
    <div
      onClick={() => void playSong(song, queue)}
      className={`group flex h-16 w-full cursor-pointer items-center gap-3 rounded-lg px-2 transition-colors duration-150 hover:bg-surface-container-high ${
        isCurrent ? "bg-secondary-container/40" : ""
      }`}
    >
      {index !== undefined ? (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center text-sm tabular-nums text-on-surface-variant">
          {isCurrent ? (
            <Icon
              name={isPlaying ? "volume_up" : "play_arrow"}
              size={20}
              className="text-primary"
            />
          ) : (
            index + 1
          )}
        </div>
      ) : (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-container-high">
          <Thumbnail src={song.thumbnailUrl} className="h-full w-full object-cover" iconSize={18} />
          {isCurrent && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Icon
                name={isPlaying ? "volume_up" : "play_arrow"}
                size={20}
                className="text-white"
              />
            </div>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm font-semibold ${
            isCurrent ? "text-primary" : ""
          }`}
        >
          {song.title}
        </div>
        <div className="flex items-center gap-1.5 truncate text-xs text-on-surface-variant">
          {liked && <Icon name="favorite" filled size={14} className="text-error" />}
          {downloaded && <Icon name="download_done" size={14} className="text-primary" />}
          {downloading && (
            <Icon name="downloading" size={14} className="animate-pulse text-primary" />
          )}
          <span className="truncate">{subtitleParts.join(" · ")}</span>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <SongMenu song={song} />
      </div>
    </div>
  );
}
