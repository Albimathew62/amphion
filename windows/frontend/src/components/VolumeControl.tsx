import Icon from "./Icon";
import { useSettings } from "../store/settings";

export default function VolumeControl({ className = "" }: { className?: string }) {
  const volume = useSettings((s) => s.volume);
  const muted = useSettings((s) => s.muted);
  const setVolume = useSettings((s) => s.setVolume);
  const toggleMute = useSettings((s) => s.toggleMute);

  const v = muted ? 0 : volume;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleMute}
        className="flex shrink-0 items-center text-on-surface-variant hover:text-on-surface"
        title={v === 0 ? "Unmute" : "Mute"}
      >
        <Icon name={v === 0 ? "volume_off" : "volume_up"} size={18} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={v}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="h-1 flex-1"
      />
    </div>
  );
}
