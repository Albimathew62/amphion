import Thumbnail from "../Thumbnail";
import { darken, rgbString, type RGB } from "../../lib/color";

interface Props {
  thumbnailUrl?: string | null;
  color?: RGB | null;
}

export default function PlayerBackdrop({ thumbnailUrl, color }: Props) {
  // Adaptive tint: a top-down gradient from the artwork color into the base surface,
  // matching Spotify's now-playing background. The blurred thumbnail stays beneath at
  // low opacity for texture. Falls back to the pure blurred backdrop when no color.
  const gradient = color
    ? `linear-gradient(180deg, ${rgbString(color)} 0%, ${rgbString(
        darken(color, 0.45),
      )} 38%, rgb(18, 18, 18) 100%)`
    : undefined;

  return (
    <div className="absolute inset-0 overflow-hidden bg-surface">
      {gradient && <div className="absolute inset-0" style={{ background: gradient }} />}
      <Thumbnail
        src={thumbnailUrl}
        className={`h-full w-full scale-125 object-cover blur-[100px] saturate-150 ${
          color ? "opacity-25" : "opacity-60"
        }`}
        hideFallback
      />
      <div className={`absolute inset-0 ${color ? "bg-black/30" : "bg-black/70"}`} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
