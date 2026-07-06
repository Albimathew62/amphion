import { useEffect, useRef, useState } from "react";
import type { Song } from "../lib/types";
import Icon from "./Icon";
import PlaylistPickerList from "./PlaylistPickerList";

interface Props {
  song: Song;
}

// Full-player action-strip button: adds the currently-playing song to a playlist.
// Styled to match the other pills (Lyrics / Queue / Download). The picker popover
// opens upward since the action strip sits near the bottom of the screen.
export default function AddToPlaylistButton({ song }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
          open ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
        }`}
        title="Add to playlist"
      >
        <Icon name="playlist_add" size={18} />
        Playlist
      </button>
      {open && (
        <div className="absolute bottom-12 left-1/2 z-50 w-60 -translate-x-1/2 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-high py-1 text-on-surface shadow-xl">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            Add to playlist
          </div>
          <PlaylistPickerList song={song} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
