import { audio } from "../lib/audio";
import { usePlayer } from "../store/player";
import Icon from "./Icon";
import Thumbnail from "./Thumbnail";
import VolumeControl from "./VolumeControl";
import SeekBar from "./player/SeekBar";

export default function MiniPlayer() {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isLoading = usePlayer((s) => s.isLoading);
  const liked = usePlayer((s) => s.liked);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const restored = usePlayer((s) => s.restored);
  const prev = usePlayer((s) => s.prev);
  const next = usePlayer((s) => s.next);
  const toggleLike = usePlayer((s) => s.toggleLike);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const openPlayer = usePlayer((s) => s.openPlayer);
  const setPanel = usePlayer((s) => s.setPanel);
  const resumeRestored = usePlayer((s) => s.resumeRestored);

  const togglePlay = () => {
    if (restored) void resumeRestored();
    else audio.toggle();
  };

  const openWithPanel = (panel: "lyrics" | "queue") => {
    setPanel(panel);
    openPlayer();
  };

  return (
    <div className="flex h-[72px] shrink-0 items-center gap-4 border-t border-white/5 bg-black/45 px-5 backdrop-blur-2xl">
      {/* Now playing — click to open the full player */}
      <div className="flex w-[300px] min-w-0 items-center gap-3">
        <button
          onClick={openPlayer}
          disabled={!current}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
          title={current ? "Open full-screen player" : undefined}
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-container elevate-1">
            <Thumbnail
              src={current?.thumbnailUrl}
              className="h-full w-full object-cover"
              iconSize={20}
              iconClassName="text-on-surface-variant/50"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-on-surface">
              {current?.title ?? "Nothing playing"}
            </div>
            <div className="truncate text-xs text-on-surface-variant">
              {current?.artist ?? ""}
            </div>
          </div>
        </button>
        {current && (
          <button
            onClick={() => void toggleLike()}
            className={`shrink-0 ${liked ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            title={liked ? "Unlike" : "Like"}
          >
            <Icon name="favorite" filled={liked} size={17} />
          </button>
        )}
      </div>

      {/* Center: transport + seek */}
      <div className="mx-auto flex min-w-0 max-w-2xl flex-1 flex-col items-center gap-1.5">
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            className={shuffle ? "text-primary" : "text-on-surface-variant"}
            title="Shuffle"
          >
            <Icon name="shuffle" size={16} />
          </button>
          <button
            onClick={prev}
            className="text-on-surface hover:scale-110"
            title="Previous"
          >
            <Icon name="skip_previous" filled size={19} />
          </button>
          <button
            onClick={togglePlay}
            disabled={!current}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 disabled:opacity-40"
            title={isPlaying ? "Pause" : "Play"}
          >
            <Icon
              name={isLoading ? "progress_activity" : isPlaying ? "pause" : "play_arrow"}
              filled
              size={18}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
          <button
            onClick={next}
            className="text-on-surface hover:scale-110"
            title="Next"
          >
            <Icon name="skip_next" filled size={19} />
          </button>
          <button
            onClick={cycleRepeat}
            className={repeat === "off" ? "text-on-surface-variant" : "text-primary"}
            title={`Repeat: ${repeat}`}
          >
            <Icon name={repeat === "one" ? "repeat_one" : "repeat"} size={16} />
          </button>
        </div>
        <SeekBar compact />
      </div>

      {/* Right actions */}
      <div className="flex w-[300px] items-center justify-end gap-3">
        <button
          onClick={() => openWithPanel("lyrics")}
          disabled={!current}
          className="text-on-surface-variant hover:text-on-surface disabled:opacity-40"
          title="Lyrics"
        >
          <Icon name="lyrics" size={18} />
        </button>
        <button
          onClick={() => openWithPanel("queue")}
          disabled={!current}
          className="text-on-surface-variant hover:text-on-surface disabled:opacity-40"
          title="Queue"
        >
          <Icon name="queue_music" size={18} />
        </button>
        <VolumeControl className="w-28" />
        <button
          onClick={openPlayer}
          disabled={!current}
          className="text-on-surface-variant hover:text-on-surface disabled:opacity-40"
          title="Full-screen player"
        >
          <Icon name="expand_less" size={20} />
        </button>
      </div>
    </div>
  );
}
