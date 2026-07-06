import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Song } from "../lib/types";
import { usePlayer } from "../store/player";
import { useDownloads } from "../store/downloads";
import Icon from "./Icon";
import PlaylistPickerList from "./PlaylistPickerList";

interface Props {
  song: Song;
  albumBrowseId?: string | null;
  artistBrowseId?: string | null;
}

export default function SongMenu({ song, albumBrowseId, artistBrowseId }: Props) {
  const [open, setOpen] = useState(false);
  const [alignTop, setAlignTop] = useState(false);
  const [view, setView] = useState<"main" | "add">("main");
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const playNext = usePlayer((s) => s.playNext);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const statuses = useDownloads((s) => s.statuses);
  const startDownload = useDownloads((s) => s.start);
  const removeDownload = useDownloads((s) => s.remove);

  const downloadState = statuses[song.videoId];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Reset to the main view whenever the menu closes.
  useEffect(() => {
    if (!open) setView("main");
  }, [open]);

  const items: { icon: string; label: string; action: () => void; submenu?: boolean }[] = [
    { icon: "playlist_play", label: "Play next", action: () => playNext(song) },
    { icon: "queue_music", label: "Add to queue", action: () => addToQueue(song) },
    { icon: "playlist_add", label: "Add to playlist", action: () => setView("add"), submenu: true },
  ];
  if (downloadState === "done") {
    items.push({
      icon: "delete",
      label: "Remove download",
      action: () => void removeDownload(song.videoId),
    });
  } else if (downloadState !== "downloading" && downloadState !== "pending") {
    items.push({
      icon: "download",
      label: "Download",
      action: () => void startDownload(song),
    });
  }
  if (albumBrowseId) {
    items.push({
      icon: "album",
      label: "Go to album",
      action: () => navigate(`/album/${albumBrowseId}`),
    });
  }
  if (artistBrowseId) {
    items.push({
      icon: "person",
      label: "Go to artist",
      action: () => navigate(`/artist/${artistBrowseId}`),
    });
  }
  items.push({
    icon: "link",
    label: "Copy link",
    action: () =>
      void navigator.clipboard.writeText(
        `https://music.youtube.com/watch?v=${song.videoId}`,
      ),
  });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setAlignTop(window.innerHeight - rect.bottom < 260);
          }
          setOpen(!open);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      >
        <Icon name="more_vert" size={20} />
      </button>
      {open && (
        <div
          className={`absolute right-0 z-40 w-56 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-high py-1 shadow-xl ${
            alignTop ? "bottom-10" : "top-10"
          }`}
        >
          {view === "main" ? (
            items.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation();
                  item.action();
                  if (!item.submenu) setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-surface-container-highest"
              >
                <Icon name={item.icon} size={18} className="text-on-surface-variant" />
                {item.label}
              </button>
            ))
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setView("main");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-highest"
              >
                <Icon name="arrow_back" size={16} />
                Add to playlist
              </button>
              <PlaylistPickerList song={song} onDone={() => setOpen(false)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
