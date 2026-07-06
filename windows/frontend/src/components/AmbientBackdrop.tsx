import { usePlayer } from "../store/player";
import Thumbnail from "./Thumbnail";

// Fixed full-viewport wash of the current track's artwork, heavily blurred and
// dimmed, sitting behind the whole app shell — same trick as PlayerBackdrop,
// but app-wide so the frosted chrome (sidebar/right-rail/mini-player) has a
// tinted backdrop to actually show through.
export default function AmbientBackdrop() {
  const current = usePlayer((s) => s.current);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      <Thumbnail
        src={current?.thumbnailUrl}
        className="absolute -inset-32 h-[calc(100%+16rem)] w-[calc(100%+16rem)] scale-125 object-cover opacity-25 blur-[140px] saturate-150"
        hideFallback
      />
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
