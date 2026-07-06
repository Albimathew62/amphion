import { formatDuration } from "../../lib/types";
import { usePlayer } from "../../store/player";
import Icon from "../Icon";
import Thumbnail from "../Thumbnail";

export default function QueuePanel() {
  const queue = usePlayer((s) => s.queue);
  const queueIndex = usePlayer((s) => s.queueIndex);
  const radioFilling = usePlayer((s) => s.radioFilling);
  const playAt = usePlayer((s) => s.playAt);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);

  const totalSeconds = queue.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
          Up next
        </h2>
        <span className="text-xs text-white/50">
          {queue.length} songs · {formatDuration(totalSeconds)}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {queue.map((song, i) => {
          const isCurrent = i === queueIndex;
          return (
            <div
              key={`${song.videoId}-${i}`}
              onClick={() => playAt(i)}
              className={`group flex h-16 cursor-pointer items-center gap-3 rounded-lg px-2 transition-colors hover:bg-white/10 ${
                isCurrent ? "bg-white/15" : ""
              }`}
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-white/10">
                <Thumbnail
                  src={song.thumbnailUrl}
                  className="h-full w-full object-cover"
                  iconSize={18}
                  iconClassName="text-white/40"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-sm font-medium ${
                    isCurrent ? "text-white" : "text-white/85"
                  }`}
                >
                  {song.title}
                </div>
                <div className="truncate text-xs text-white/50">{song.artist}</div>
              </div>
              <span className="text-xs tabular-nums text-white/40">
                {formatDuration(song.duration)}
              </span>
              {!isCurrent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(i);
                  }}
                  className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white group-hover:flex"
                  title="Remove from queue"
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          );
        })}

        {radioFilling && (
          <div className="flex items-center gap-3 px-2 py-4 text-white/50">
            <Icon name="progress_activity" size={18} className="animate-spin" />
            <span className="text-xs">Finding similar songs…</span>
          </div>
        )}
      </div>
    </div>
  );
}
