"""lrclib.net lyrics — ports the Android :lrclib module.

Query GET /api/search?track_name=&artist_name=[&album_name=], pick the best
match by |duration diff| <= 2s (same tolerance as LrcLib.kt), prefer synced
lyrics, and parse LRC [mm:ss.xx] timestamps into timed lines.
"""

import re

import httpx

from app.config import settings
from app.schemas.schemas import LyricsLine, LyricsOut

DURATION_TOLERANCE = 2.0
LRC_LINE = re.compile(r"\[(\d{1,2}):(\d{2})\.(\d{2,3})\]\s?(.*)")


def parse_lrc(text: str) -> list[LyricsLine]:
    lines: list[LyricsLine] = []
    for raw in text.splitlines():
        m = LRC_LINE.match(raw.strip())
        if not m:
            continue
        minutes, seconds, frac, content = m.groups()
        frac_ms = int(frac) * (10 if len(frac) == 2 else 1)
        time_ms = (int(minutes) * 60 + int(seconds)) * 1000 + frac_ms
        lines.append(LyricsLine(time_ms=time_ms, text=content.strip()))
    return lines


def _pick_best(candidates: list[dict], duration: int | None, key: str) -> dict | None:
    pool = [c for c in candidates if c.get(key)]
    if not pool:
        return None
    if duration and duration > 0:
        pool = [
            c
            for c in pool
            if abs((c.get("duration") or 0) - duration) <= DURATION_TOLERANCE
        ]
        if not pool:
            return None
        return min(pool, key=lambda c: abs((c.get("duration") or 0) - duration))
    return pool[0]


async def get_lyrics(
    track: str, artist: str, duration: int | None = None, album: str | None = None
) -> LyricsOut | None:
    params = {"track_name": track, "artist_name": artist}
    if album:
        params["album_name"] = album
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{settings.lrclib_base_url}/api/search", params=params)
        resp.raise_for_status()
        candidates = resp.json()
    if not isinstance(candidates, list):
        return None

    best = _pick_best(candidates, duration, "syncedLyrics")
    if best:
        lines = parse_lrc(best["syncedLyrics"])
        if lines:
            return LyricsOut(synced=True, lines=lines, plain=best.get("plainLyrics"))

    best = _pick_best(candidates, duration, "plainLyrics")
    if best:
        return LyricsOut(synced=False, plain=best["plainLyrics"])
    return None
