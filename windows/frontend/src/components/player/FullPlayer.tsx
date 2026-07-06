import { useEffect, useState } from "react";
import { usePlayer } from "../../store/player";
import { useDownloads } from "../../store/downloads";
import { hqThumbnail } from "../../lib/image";
import { extractDominantColor, type RGB } from "../../lib/color";
import Icon from "../Icon";
import Thumbnail from "../Thumbnail";
import VolumeControl from "../VolumeControl";
import AddToPlaylistButton from "../AddToPlaylistButton";
import PlayerBackdrop from "./PlayerBackdrop";
import SeekBar from "./SeekBar";
import TransportControls from "./TransportControls";
import QueuePanel from "./QueuePanel";
import LyricsPanel from "./LyricsPanel";

export default function FullPlayer() {
  const current = usePlayer((s) => s.current);
  const playerOpen = usePlayer((s) => s.playerOpen);
  const panel = usePlayer((s) => s.panel);
  const liked = usePlayer((s) => s.liked);
  const closePlayer = usePlayer((s) => s.closePlayer);
  const setPanel = usePlayer((s) => s.setPanel);
  const toggleLike = usePlayer((s) => s.toggleLike);
  const statuses = useDownloads((s) => s.statuses);
  const startDownload = useDownloads((s) => s.start);
  const removeDownload = useDownloads((s) => s.remove);

  const [bgColor, setBgColor] = useState<RGB | null>(null);

  // Derive the adaptive background tint from the current artwork.
  useEffect(() => {
    const url = current?.thumbnailUrl;
    if (!url) {
      setBgColor(null);
      return;
    }
    let cancelled = false;
    extractDominantColor(url).then((c) => {
      if (!cancelled) setBgColor(c);
    });
    return () => {
      cancelled = true;
    };
  }, [current?.thumbnailUrl]);

  // Escape closes panel first, then the player
  useEffect(() => {
    if (!playerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const { panel } = usePlayer.getState();
      if (panel !== "none") setPanel("none");
      else closePlayer();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playerOpen, closePlayer, setPanel]);

  if (!current) return null;

  const downloadState = statuses[current.videoId];
  const downloaded = downloadState === "done";
  const downloading = downloadState === "downloading" || downloadState === "pending";

  const handleDownload = () => {
    if (downloaded) void removeDownload(current.videoId);
    else if (!downloading) void startDownload(current);
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-transform duration-300 ease-out ${
        playerOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <PlayerBackdrop thumbnailUrl={current.thumbnailUrl} color={bgColor} />

      <div className="relative flex h-full flex-col text-white">
        {/* Header */}
        <div className="flex shrink-0 items-center px-6 py-4">
          <button
            onClick={closePlayer}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            title="Collapse"
          >
            <Icon name="keyboard_arrow_down" size={28} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 items-center justify-center gap-12 px-10 pb-10">
          {/* Center column */}
          <div className="flex w-full max-w-md flex-col items-center gap-6">
            {/* Artwork with glow */}
            <div className="relative w-full max-w-[24rem]">
              <Thumbnail
                src={current.thumbnailUrl}
                className="absolute inset-0 h-full w-full scale-105 rounded-2xl opacity-60 blur-2xl"
                hideFallback
              />
              <Thumbnail
                src={hqThumbnail(current.thumbnailUrl)}
                className="relative aspect-square w-full rounded-2xl object-cover shadow-2xl"
                fallbackClassName="flex aspect-square w-full items-center justify-center rounded-2xl bg-white/10"
                iconSize={64}
                iconClassName="text-white/40"
              />
            </div>

            {/* Title row */}
            <div className="flex w-full items-center gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold">{current.title}</h1>
                <p className="truncate text-base text-white/70">{current.artist}</p>
              </div>
              <button
                onClick={() => void toggleLike()}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 ${
                  liked ? "text-error" : "text-white"
                }`}
                title={liked ? "Unlike" : "Like"}
              >
                <Icon name="favorite" filled={liked} size={22} />
              </button>
            </div>

            <SeekBar light />
            <TransportControls />

            <div className="w-48">
              <VolumeControl />
            </div>

            {/* Action strip */}
            <div className="flex items-center gap-2">
              <AddToPlaylistButton song={current} />
              <button
                onClick={() => setPanel(panel === "lyrics" ? "none" : "lyrics")}
                className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                  panel === "lyrics"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Icon name="lyrics" size={18} />
                Lyrics
              </button>
              <button
                onClick={() => setPanel(panel === "queue" ? "none" : "queue")}
                className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                  panel === "queue"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Icon name="queue_music" size={18} />
                Queue
              </button>
              <button
                onClick={handleDownload}
                className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                  downloaded
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title={downloaded ? "Remove download" : "Download"}
              >
                <Icon
                  name={
                    downloading
                      ? "progress_activity"
                      : downloaded
                        ? "download_done"
                        : "download"
                  }
                  size={18}
                  className={downloading ? "animate-spin" : ""}
                />
                {downloading ? "Downloading" : downloaded ? "Downloaded" : "Download"}
              </button>
            </div>
          </div>

          {/* Side panel */}
          {panel !== "none" && (
            <div className="hidden h-full w-[26rem] shrink-0 py-2 lg:block">
              {panel === "lyrics" ? <LyricsPanel /> : <QueuePanel />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
