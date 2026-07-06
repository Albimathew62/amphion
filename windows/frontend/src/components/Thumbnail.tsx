import { useEffect, useState } from "react";
import Icon from "./Icon";

interface Props {
  src?: string | null;
  alt?: string;
  className: string; // classes for the <img> when it renders successfully
  fallbackClassName?: string; // classes for the fallback wrapper (default: fills parent, centers icon)
  icon?: string;
  iconSize?: number;
  iconClassName?: string;
  hideFallback?: boolean; // render nothing (no icon) when missing/broken — for decorative backdrops
}

// Wraps a thumbnail <img> with a graceful fallback for both a missing
// thumbnailUrl and a URL that fails to load (expired/blocked CDN link) —
// without this, a failed load just shows the browser's broken-image glyph.
export default function Thumbnail({
  src,
  alt = "",
  className,
  fallbackClassName = "flex h-full w-full items-center justify-center",
  icon = "music_note",
  iconSize = 20,
  iconClassName = "text-on-surface-variant/40",
  hideFallback = false,
}: Props) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    if (hideFallback) return null;
    return (
      <div className={fallbackClassName}>
        <Icon name={icon} size={iconSize} className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
