"""yt-dlp stream URL resolution with quality selection + in-memory expiry cache.

Quality selection ports Android's YTPlayerUtils.selectAudioFormatCandidates:
target bitrates LOW=70 / HIGH=160 / HIGHEST=320 kbps, AUTO=unlimited; pick the
highest-abr format at or below target, else the lowest above it.

URLs are cached per (videoId, quality) until the googlevideo `expire`
timestamp, then re-resolved. Never persisted (they expire in ~6h).
"""

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse

from yt_dlp import YoutubeDL

from app.config import settings

YDL_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "skip_download": True,
}

FALLBACK_TTL_SECONDS = 5 * 3600

QUALITY_TARGET_KBPS: dict[str, int | None] = {
    "low": 70,
    "high": 160,
    "highest": 320,
    "auto": None,
}


@dataclass
class CachedStream:
    url: str
    expires_at: float  # unix seconds
    abr: float = 0.0
    format_id: str = ""
    ext: str = ""
    loudness: float | None = None  # integrated loudness in dB, for normalization


_cache: dict[tuple[str, str], CachedStream] = {}
_locks: dict[tuple[str, str], asyncio.Lock] = defaultdict(asyncio.Lock)


def select_audio_format(
    formats: list[dict], quality: str, require_m4a: bool = False
) -> dict:
    candidates = [
        f
        for f in formats
        if f.get("acodec") not in (None, "none")
        and f.get("vcodec") in (None, "none")
        and f.get("url")
        and f.get("abr")
        and f.get("protocol") in ("https", "http")
    ]
    if require_m4a:
        m4a = [f for f in candidates if f.get("ext") == "m4a"]
        candidates = m4a or candidates
    if not candidates:
        raise RuntimeError("No suitable audio format found")

    target = QUALITY_TARGET_KBPS.get(quality)
    if target is None:
        return max(candidates, key=lambda f: f["abr"])
    below = [f for f in candidates if f["abr"] <= target]
    if below:
        return max(below, key=lambda f: f["abr"])
    return min(candidates, key=lambda f: f["abr"])


def _parse_expiry(url: str) -> float:
    try:
        expire = parse_qs(urlparse(url).query).get("expire", [None])[0]
        if expire:
            return float(expire)
    except (ValueError, TypeError):
        pass
    return time.time() + FALLBACK_TTL_SECONDS


def extract_info_sync(video_id: str) -> dict:
    with YoutubeDL(YDL_OPTS) as ydl:
        return ydl.extract_info(
            f"https://music.youtube.com/watch?v={video_id}", download=False
        )


def _extract_loudness(info: dict, fmt: dict) -> float | None:
    """Best-effort integrated loudness in dB from yt-dlp metadata."""
    for source in (fmt, info):
        for key in ("loudness_db", "loudness"):
            value = source.get(key)
            if isinstance(value, (int, float)):
                return float(value)
    return None


def _extract_sync(video_id: str, quality: str) -> CachedStream:
    info = extract_info_sync(video_id)
    fmt = select_audio_format(info.get("formats") or [], quality)
    url = fmt["url"]
    expires_at = _parse_expiry(url) - settings.stream_cache_safety_seconds
    return CachedStream(
        url=url,
        expires_at=expires_at,
        abr=fmt.get("abr") or 0.0,
        format_id=fmt.get("format_id") or "",
        ext=fmt.get("ext") or "",
        loudness=_extract_loudness(info, fmt),
    )


async def get_stream(video_id: str, quality: str = "auto") -> CachedStream:
    key = (video_id, quality)
    cached = _cache.get(key)
    if cached and cached.expires_at > time.time():
        return cached
    async with _locks[key]:
        cached = _cache.get(key)
        if cached and cached.expires_at > time.time():
            return cached
        stream = await asyncio.to_thread(_extract_sync, video_id, quality)
        _cache[key] = stream
        return stream
