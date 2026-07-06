import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Lyrics } from "../../lib/types";
import { usePlayer } from "../../store/player";
import Icon from "../Icon";

// Cache lyrics by videoId so toggling thumbnail↔lyrics (which unmounts/remounts this
// panel) doesn't re-hit the network every time. "none" records a confirmed miss.
const lyricsCache = new Map<string, Lyrics | "none">();

export default function LyricsPanel() {
  const current = usePlayer((s) => s.current);
  const positionMs = usePlayer((s) => s.positionMs);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "none">("loading");
  const activeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!current) return;
    const videoId = current.videoId;

    const cached = lyricsCache.get(videoId);
    if (cached !== undefined) {
      if (cached === "none") {
        setLyrics(null);
        setStatus("none");
      } else {
        setLyrics(cached);
        setStatus("ok");
      }
      return;
    }

    setStatus("loading");
    setLyrics(null);
    let cancelled = false;
    api
      .getLyrics(current.title, current.artist, current.duration || undefined)
      .then((l) => {
        lyricsCache.set(videoId, l);
        if (cancelled) return;
        setLyrics(l);
        setStatus("ok");
      })
      .catch(() => {
        lyricsCache.set(videoId, "none");
        if (cancelled) return;
        setStatus("none");
      });
    return () => {
      cancelled = true;
    };
  }, [current?.videoId]);

  const activeIndex = useMemo(() => {
    const lines = lyrics?.lines;
    if (!lines?.length) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timeMs <= positionMs) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, positionMs]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-white/70">
        Lyrics
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 [mask-image:linear-gradient(to_bottom,transparent_0%,black_7%,black_93%,transparent_100%)]">
        {status === "loading" && (
          <div className="flex items-center gap-3 text-white/50">
            <Icon name="progress_activity" size={18} className="animate-spin" />
            <span className="text-sm">Searching lyrics…</span>
          </div>
        )}
        {status === "none" && (
          <p className="text-sm text-white/50">No lyrics found for this song.</p>
        )}
        {status === "ok" && lyrics?.synced && lyrics.lines && (
          <div className="space-y-4 pb-24 pt-6">
            {lyrics.lines.map((line, i) => (
              <p
                key={i}
                ref={i === activeIndex ? activeRef : undefined}
                className={`origin-left text-xl font-semibold leading-relaxed transition-all duration-200 ${
                  i === activeIndex ? "scale-[1.03] text-white" : "text-white/40"
                }`}
              >
                {line.text || "…"}
              </p>
            ))}
          </div>
        )}
        {status === "ok" && !lyrics?.synced && (
          <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-white/80">
            {lyrics?.plain}
          </pre>
        )}
      </div>
    </div>
  );
}
