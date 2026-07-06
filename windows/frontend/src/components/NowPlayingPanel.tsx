import { useState } from "react";
import { usePlayer } from "../store/player";
import { hqThumbnail } from "../lib/image";
import Icon from "./Icon";
import Thumbnail from "./Thumbnail";
import LyricsPanel from "./player/LyricsPanel";
import { formatDuration } from "../lib/types";

export default function NowPlayingPanel() {
  const current = usePlayer((s) => s.current);
  const liked = usePlayer((s) => s.liked);
  const queue = usePlayer((s) => s.queue);
  const queueIndex = usePlayer((s) => s.queueIndex);
  const radioFilling = usePlayer((s) => s.radioFilling);
  const playAt = usePlayer((s) => s.playAt);
  const toggleLike = usePlayer((s) => s.toggleLike);
  const openPlayer = usePlayer((s) => s.openPlayer);

  const [showLyrics, setShowLyrics] = useState(false);

  const upNext = queue.slice(queueIndex + 1, queueIndex + 8);

  return (
    <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-white/5 bg-black/40 backdrop-blur-2xl xl:flex">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant/70">
          {showLyrics ? "Lyrics" : "Now Playing"}
        </span>
        <button
          onClick={openPlayer}
          disabled={!current}
          className="text-on-surface-variant hover:text-on-surface disabled:opacity-40"
          title="Open full-screen player"
        >
          <Icon name="expand_less" size={18} />
        </button>
      </div>

      {!current ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-on-surface-variant">
          <Icon name="music_note" size={40} className="opacity-40" />
          <p className="text-sm">Nothing playing</p>
        </div>
      ) : (
        <>
          {/* Artwork or lyrics */}
          <div className="px-6 pt-5">
            {showLyrics ? (
              <div className="h-[340px] overflow-hidden rounded-2xl bg-gradient-to-b from-primary-container/25 to-surface-container p-1">
                <LyricsPanel />
              </div>
            ) : (
              <div className="aspect-square w-full overflow-hidden rounded-2xl bg-surface-container-high elevate-2">
                <Thumbnail src={hqThumbnail(current.thumbnailUrl)} className="h-full w-full object-cover" iconSize={48} />
              </div>
            )}

            {/* Title / artist / like */}
            <div className="mt-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xl font-bold text-on-surface">
                  {current.title}
                </div>
                <div className="mt-1 truncate text-sm text-on-surface-variant">
                  {current.artist}
                </div>
                {current.album && (
                  <div className="truncate text-xs text-on-surface-variant/60">
                    {current.album}
                  </div>
                )}
              </div>
              <button
                onClick={() => void toggleLike()}
                className={`shrink-0 ${liked ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                title={liked ? "Unlike" : "Like"}
              >
                <Icon name="favorite" filled={liked} size={22} />
              </button>
            </div>
          </div>

          {/* Lyrics toggle */}
          <div className="px-6 pt-5">
            <button
              onClick={() => setShowLyrics((v) => !v)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant py-2.5 text-[12.5px] font-medium ${
                showLyrics
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name="lyrics" size={16} />
              Lyrics
            </button>
          </div>

          {/* Up next */}
          <div className="px-6 pb-6 pt-6">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant/70">
              Up Next
            </div>
            <div className="flex flex-col gap-0.5">
              {upNext.map((song, i) => (
                <button
                  key={`${song.videoId}-${i}`}
                  onClick={() => playAt(queueIndex + 1 + i)}
                  className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-container-high">
                    <Thumbnail src={song.thumbnailUrl} className="h-full w-full object-cover" iconSize={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-on-surface">
                      {song.title}
                    </div>
                    <div className="truncate text-[11.5px] text-on-surface-variant">
                      {song.artist}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-on-surface-variant/60">
                    {formatDuration(song.duration)}
                  </span>
                </button>
              ))}
              {radioFilling && (
                <div className="flex items-center gap-3 px-2 py-3 text-on-surface-variant/60">
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  <span className="text-xs">Finding similar songs…</span>
                </div>
              )}
              {upNext.length === 0 && !radioFilling && (
                <div className="px-2 py-2 text-xs text-on-surface-variant/50">
                  End of queue
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
