from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_session
from app.db.models import Song
from app.schemas.schemas import StreamOut
from app.services import download_service, settings_service, stream_service

router = APIRouter(tags=["stream"])

LOCAL_NEVER_EXPIRES = 2**31 - 1


@router.get("/stream/{video_id}")
async def stream(
    video_id: str,
    redirect: bool = False,
    quality: str | None = Query(None, pattern="^(auto|low|high|highest)$"),
    session: AsyncSession = Depends(get_session),
):
    # Downloaded file wins (mirrors Android's downloadCache-first resolution)
    song = await session.get(Song, video_id)
    if song and song.date_download and download_service.file_path(video_id).exists():
        url = f"http://{settings.host}:{settings.port}/downloads/{video_id}/file"
        if redirect:
            return RedirectResponse(url, status_code=307)
        return StreamOut(
            video_id=video_id, url=url, expires_at=LOCAL_NEVER_EXPIRES, local=True
        )

    q = quality or await settings_service.get_value(session, "audioQuality")
    try:
        cached = await stream_service.get_stream(video_id, q)
    except Exception as e:
        raise HTTPException(502, f"Stream extraction failed: {e}")
    if redirect:
        return RedirectResponse(cached.url, status_code=307)
    return StreamOut(
        video_id=video_id,
        url=cached.url,
        expires_at=int(cached.expires_at),
        loudness=cached.loudness,
    )
