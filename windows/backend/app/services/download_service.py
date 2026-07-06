"""Song downloads to an app-managed folder — ports Android's DownloadUtil.

Downloads the exact audio format chosen by the quality rule (m4a preferred,
no ffmpeg remux needed) to downloads/{videoId}.m4a. Completion is recorded
on Song.date_download; live progress is tracked in memory.
"""

import asyncio
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from yt_dlp import YoutubeDL

from app.config import settings
from app.db.models import Song
from app.services.stream_service import extract_info_sync, select_audio_format


@dataclass
class DownloadStatus:
    status: Literal["pending", "downloading", "done", "error"]
    progress: float = 0.0  # 0..1
    error: str | None = None


_statuses: dict[str, DownloadStatus] = {}

# YouTube video ids are [A-Za-z0-9_-]. Reject anything else (`.`, `/`, `\`) so a
# crafted id can't escape the downloads dir via path traversal (read/delete/write).
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def file_path(video_id: str) -> Path:
    if not _VIDEO_ID_RE.fullmatch(video_id):
        raise ValueError(f"Invalid video id: {video_id!r}")
    return settings.downloads_dir / f"{video_id}.m4a"


def get_status(video_id: str) -> DownloadStatus | None:
    return _statuses.get(video_id)


def is_active(video_id: str) -> bool:
    status = _statuses.get(video_id)
    return status is not None and status.status in ("pending", "downloading")


def _download_sync(video_id: str, quality: str) -> None:
    info = extract_info_sync(video_id)
    fmt = select_audio_format(info.get("formats") or [], quality, require_m4a=True)

    def hook(d: dict) -> None:
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            done = d.get("downloaded_bytes")
            if total and done:
                _statuses[video_id].progress = min(done / total, 1.0)

    opts = {
        "format": fmt["format_id"],
        "outtmpl": str(file_path(video_id)),
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "progress_hooks": [hook],
    }
    with YoutubeDL(opts) as ydl:
        ydl.download([f"https://music.youtube.com/watch?v={video_id}"])


async def _run(video_id: str, quality: str) -> None:
    from app.db.database import async_session_maker
    from app.db.models import utcnow

    _statuses[video_id] = DownloadStatus(status="downloading")
    try:
        await asyncio.to_thread(_download_sync, video_id, quality)
        async with async_session_maker() as session:
            song = await session.get(Song, video_id)
            if song:
                song.date_download = utcnow()
                await session.commit()
        _statuses[video_id] = DownloadStatus(status="done", progress=1.0)
    except Exception as e:
        _statuses[video_id] = DownloadStatus(status="error", error=str(e))
        file_path(video_id).unlink(missing_ok=True)


def start(video_id: str, quality: str) -> DownloadStatus:
    _statuses[video_id] = DownloadStatus(status="pending")
    asyncio.get_running_loop().create_task(_run(video_id, quality))
    return _statuses[video_id]
