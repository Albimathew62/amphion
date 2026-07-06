from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.db.models import Song
from app.schemas.schemas import ApiModel, SongIn, SongOut
from app.services import download_service, library_service, settings_service

router = APIRouter(tags=["downloads"])

# Constrain path ids to the YouTube charset so they can't be used for path traversal.
VideoId = Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{1,64}$")]


def _downloaded_exists(video_id: str) -> bool:
    try:
        return download_service.file_path(video_id).exists()
    except ValueError:
        return False


class DownloadStatusOut(ApiModel):
    video_id: str
    status: str
    progress: float = 0.0
    error: str | None = None


class DownloadedSongOut(ApiModel):
    song: SongOut
    date_download: datetime


@router.post("/downloads/{video_id}", response_model=DownloadStatusOut, status_code=202)
async def start_download(
    video_id: VideoId, song: SongIn, session: AsyncSession = Depends(get_session)
) -> DownloadStatusOut:
    if song.video_id != video_id:
        raise HTTPException(400, "videoId in path and body must match")
    if download_service.is_active(video_id):
        status = download_service.get_status(video_id)
        return DownloadStatusOut(
            video_id=video_id, status=status.status, progress=status.progress
        )
    await library_service.upsert_song(session, song)
    await session.commit()
    quality = await settings_service.get_value(session, "audioQuality")
    status = download_service.start(video_id, quality)
    return DownloadStatusOut(video_id=video_id, status=status.status)


@router.get("/downloads", response_model=list[DownloadedSongOut])
async def list_downloads(
    session: AsyncSession = Depends(get_session),
) -> list[DownloadedSongOut]:
    result = await session.execute(
        select(Song)
        .where(Song.date_download.is_not(None))
        .order_by(Song.date_download.desc())
    )
    return [
        DownloadedSongOut(song=SongOut.model_validate(s), date_download=s.date_download)
        for s in result.scalars()
        if _downloaded_exists(s.video_id)
    ]


@router.get("/downloads/{video_id}/status", response_model=DownloadStatusOut)
async def download_status(
    video_id: VideoId, session: AsyncSession = Depends(get_session)
) -> DownloadStatusOut:
    status = download_service.get_status(video_id)
    if status:
        return DownloadStatusOut(
            video_id=video_id,
            status=status.status,
            progress=status.progress,
            error=status.error,
        )
    song = await session.get(Song, video_id)
    if song and song.date_download and download_service.file_path(video_id).exists():
        return DownloadStatusOut(video_id=video_id, status="done", progress=1.0)
    raise HTTPException(404, "No download for this song")


@router.get("/downloads/{video_id}/file")
async def download_file(video_id: VideoId) -> FileResponse:
    path = download_service.file_path(video_id)
    if not path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(path, media_type="audio/mp4")


@router.delete("/downloads/{video_id}", status_code=204)
async def delete_download(
    video_id: VideoId, session: AsyncSession = Depends(get_session)
) -> None:
    download_service.file_path(video_id).unlink(missing_ok=True)
    song = await session.get(Song, video_id)
    if song:
        song.date_download = None
        await session.commit()
