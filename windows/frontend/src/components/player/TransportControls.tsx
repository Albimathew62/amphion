import { audio } from "../../lib/audio";
import { usePlayer } from "../../store/player";
import Icon from "../Icon";

export default function TransportControls() {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isLoading = usePlayer((s) => s.isLoading);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const restored = usePlayer((s) => s.restored);
  const prev = usePlayer((s) => s.prev);
  const next = usePlayer((s) => s.next);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const resumeRestored = usePlayer((s) => s.resumeRestored);

  const togglePlay = () => {
    if (restored) void resumeRestored();
    else audio.toggle();
  };

  return (
    <div className="flex w-full items-center justify-evenly">
      <button
        onClick={toggleShuffle}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:bg-white/10 ${
          shuffle ? "text-white" : "text-white/40"
        }`}
        title="Shuffle"
      >
        <Icon name="shuffle" size={22} />
      </button>

      <button
        onClick={prev}
        className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white/10 p-3 text-white hover:bg-white/20"
        title="Previous"
      >
        <Icon name="skip_previous" filled size={28} />
      </button>

      <button
        onClick={togglePlay}
        className="relative flex h-[70px] w-[70px] items-center justify-center rounded-full bg-white text-black elevate-glow transition-transform hover:scale-[1.04]"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying && <span className="amphion-ring" style={{ borderColor: "#ffffff" }} />}
        <Icon
          name={isLoading ? "progress_activity" : isPlaying ? "pause" : "play_arrow"}
          filled
          size={34}
          className={isLoading ? "animate-spin" : ""}
        />
      </button>

      <button
        onClick={next}
        className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white/10 p-3 text-white hover:bg-white/20"
        title="Next"
      >
        <Icon name="skip_next" filled size={28} />
      </button>

      <button
        onClick={cycleRepeat}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:bg-white/10 ${
          repeat === "off" ? "text-white/40" : "text-white"
        }`}
        title={`Repeat: ${repeat}`}
      >
        <Icon name={repeat === "one" ? "repeat_one" : "repeat"} size={22} />
      </button>
    </div>
  );
}
