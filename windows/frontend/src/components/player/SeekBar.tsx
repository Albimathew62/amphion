import { audio } from "../../lib/audio";
import { formatDuration } from "../../lib/types";
import { usePlayer } from "../../store/player";

interface Props {
  compact?: boolean;
  light?: boolean; // white styling on artwork backdrop
}

export default function SeekBar({ compact, light }: Props) {
  const positionMs = usePlayer((s) => s.positionMs);
  const durationMs = usePlayer((s) => s.durationMs);
  const current = usePlayer((s) => s.current);
  const setPosition = usePlayer((s) => s.setPosition);

  const seek = (ms: number) => {
    audio.seek(ms);
    setPosition(ms);
  };

  const label = light ? "text-white/70" : "text-on-surface-variant";

  return (
    <div className="flex w-full items-center gap-2">
      <span className={`w-10 shrink-0 text-right text-[11px] tabular-nums ${label}`}>
        {formatDuration(positionMs / 1000)}
      </span>
      <input
        type="range"
        min={0}
        max={durationMs || 1}
        value={Math.min(positionMs, durationMs || 1)}
        onChange={(e) => seek(Number(e.target.value))}
        disabled={!current}
        className={`flex-1 ${compact ? "h-1" : "h-1.5"} ${light ? "accent-white" : ""}`}
      />
      <span className={`w-10 shrink-0 text-[11px] tabular-nums ${label}`}>
        {formatDuration(durationMs / 1000)}
      </span>
    </div>
  );
}
