import { useEffect, useRef } from "react";
import { audio } from "../lib/audio";
import { api } from "../lib/api";
import { usePlayer } from "../store/player";
import { useSettings } from "../store/settings";

const LOUDNESS_REFERENCE = -14; // dB target for normalization

function normalizeMultiplier(loudness: number | null, on: boolean): number {
  if (!on || loudness == null) return 1;
  if (loudness <= LOUDNESS_REFERENCE) return 1; // can't boost with HTML5 volume
  return Math.min(1, Math.pow(10, (LOUDNESS_REFERENCE - loudness) / 20));
}

// Non-visual owner of the two <audio> decks. Drives crossfade/gapless/normalize.
export default function AudioEngine() {
  const deckA = useRef<HTMLAudioElement>(null);
  const deckB = useRef<HTMLAudioElement>(null);
  const retriedRef = useRef(false);
  const lastAppliedUrl = useRef<string | null>(null);
  const transitioning = useRef(false);
  // Per-load state for coaxing a real duration out of streams that report Infinity.
  const durationFix = useRef<{ coaxed: boolean; restoreTo: number | null }>({
    coaxed: false,
    restoreTo: null,
  });
  const preload = useRef<{ index: number; url: string; loudness: number | null } | null>(null);
  const streamCache = useRef(new Map<string, { url: string; loudness: number | null }>());

  const streamUrl = usePlayer((s) => s.streamUrl);
  const current = usePlayer((s) => s.current);
  const loudness = usePlayer((s) => s.loudness);
  const queue = usePlayer((s) => s.queue);
  const queueIndex = usePlayer((s) => s.queueIndex);
  const repeat = usePlayer((s) => s.repeat);
  const shuffle = usePlayer((s) => s.shuffle);

  const volume = useSettings((s) => s.volume);
  const muted = useSettings((s) => s.muted);
  const normalize = useSettings((s) => s.normalize);

  // Register both decks.
  useEffect(() => {
    audio.register(deckA.current, deckB.current);
    return () => audio.register(null, null);
  }, []);

  // Volume / mute.
  useEffect(() => {
    audio.setVolume(volume);
  }, [volume]);
  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  // Normalize for the active track.
  useEffect(() => {
    audio.setActiveNormalize(normalizeMultiplier(loudness, normalize));
  }, [loudness, normalize, current?.videoId]);

  // Guarded hard-load on the active deck. Skips when the engine already advanced
  // (crossfade/gapless) to this URL.
  useEffect(() => {
    if (!streamUrl) return;
    if (streamUrl === lastAppliedUrl.current) return;
    retriedRef.current = false;
    // A fresh user-initiated load clears any in-flight transition state. Without this,
    // a manual skip during a crossfade would leave `transitioning` stuck true (its
    // onComplete never fires), wedging later auto-advances / crossfades.
    transitioning.current = false;
    durationFix.current = { coaxed: false, restoreTo: null };
    lastAppliedUrl.current = streamUrl;
    audio.loadActive(streamUrl, {
      normalizeMult: normalizeMultiplier(loudness, useSettings.getState().normalize),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  // Preload the next track onto the idle deck.
  useEffect(() => {
    const idx = usePlayer.getState().nextIndex();
    if (idx == null || idx === queueIndex) {
      preload.current = null;
      return;
    }
    const nextSong = queue[idx];
    if (!nextSong) return;
    let cancelled = false;
    const cached = streamCache.current.get(nextSong.videoId);
    const apply = (info: { url: string; loudness: number | null }) => {
      if (cancelled) return;
      preload.current = { index: idx, url: info.url, loudness: info.loudness };
      audio.preloadIdle(
        info.url,
        normalizeMultiplier(info.loudness, useSettings.getState().normalize),
      );
    };
    if (cached) {
      apply(cached);
    } else {
      api
        .getStream(nextSong.videoId)
        .then((s) => {
          const info = { url: s.url, loudness: s.loudness ?? null };
          streamCache.current.set(nextSong.videoId, info);
          apply(info);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.videoId, queue, queueIndex, repeat, shuffle]);

  // Space toggles play/pause globally (except in inputs).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      e.preventDefault();
      audio.toggle();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Persist position for resume-after-restart.
  useEffect(() => {
    const save = () => {
      const { positionMs, current: c } = usePlayer.getState();
      if (c) localStorage.setItem("amphion-pos", String(Math.floor(positionMs)));
    };
    const interval = window.setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", save);
    };
  }, []);

  const isActive = (el: HTMLAudioElement) => el === audio.element;

  const commitAdvance = (next: { index: number; url: string; loudness: number | null }) => {
    lastAppliedUrl.current = next.url;
    usePlayer.getState().advanceViaEngine(next.index, next.url, next.loudness);
  };

  // Resolve total duration robustly. Some machines/streams report `Infinity`, so
  // `onDurationChange` (which only fires finite) never updates and the total time is
  // stuck at 0:00. When we see Infinity, seek far past the end once to force the browser
  // to compute the real duration, then restore the playback position.
  const resolveDuration = (el: HTMLAudioElement) => {
    if (!isActive(el)) return;
    const d = el.duration;
    if (Number.isFinite(d) && d > 0) {
      usePlayer.getState().setDuration(d * 1000);
      if (durationFix.current.restoreTo != null) {
        const t = durationFix.current.restoreTo;
        durationFix.current.restoreTo = null;
        try {
          el.currentTime = t;
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (d === Infinity && !durationFix.current.coaxed) {
      durationFix.current.coaxed = true;
      durationFix.current.restoreTo = el.currentTime || 0;
      try {
        el.currentTime = 1e7;
      } catch {
        durationFix.current.restoreTo = null;
      }
      // Safety: if the browser never resolves a finite duration, don't leave the
      // seekbar frozen — give up on the coax after a short grace period.
      window.setTimeout(() => {
        durationFix.current.restoreTo = null;
      }, 800);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const el = e.currentTarget;
    if (!isActive(el)) return;
    // Ignore the transient jump while coaxing duration (currentTime was bumped to 1e7).
    if (durationFix.current.restoreTo != null) return;
    usePlayer.getState().setPosition(el.currentTime * 1000);

    const { crossfade, crossfadeSec } = useSettings.getState();
    if (!crossfade || transitioning.current) return;
    const next = preload.current;
    if (!next || !Number.isFinite(el.duration)) return;
    const remaining = el.duration - el.currentTime;
    if (remaining > 0 && remaining <= crossfadeSec) {
      transitioning.current = true;
      audio.crossfadeToIdle(crossfadeSec, () => {
        commitAdvance(next);
        transitioning.current = false;
      });
    }
  };

  const handleEnded = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (!isActive(e.currentTarget)) return;
    // Seeking to 1e7 during the duration coax can emit a spurious `ended`; ignore it so
    // it doesn't trigger a premature gapless swap (→ overlapping audio).
    if (durationFix.current.restoreTo != null) return;
    if (transitioning.current) return;
    const { gapless } = useSettings.getState();
    const next = preload.current;
    if (next && gapless) {
      transitioning.current = true;
      audio.swapToIdle(() => {
        commitAdvance(next);
        transitioning.current = false;
      });
    } else {
      usePlayer.getState().onEnded();
    }
  };

  const handleError = async (e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (!isActive(e.currentTarget)) return;
    if (!usePlayer.getState().current) return;
    if (retriedRef.current) {
      usePlayer.getState().next();
      return;
    }
    retriedRef.current = true;
    const url = await usePlayer.getState().refreshStream();
    if (url) {
      lastAppliedUrl.current = url;
      audio.loadActive(url);
    }
  };

  const commonProps = {
    // No crossOrigin: googlevideo streams send no CORS header, so
    // crossOrigin="anonymous" would make the browser reject the media load.
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
    onError: handleError,
    onPlay: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      isActive(e.currentTarget) && usePlayer.getState().setIsPlaying(true),
    onPause: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      isActive(e.currentTarget) && usePlayer.getState().setIsPlaying(false),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      resolveDuration(e.currentTarget),
    onDurationChange: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      resolveDuration(e.currentTarget),
  };

  return (
    <>
      <audio ref={deckA} {...commonProps} />
      <audio ref={deckB} {...commonProps} />
    </>
  );
}
