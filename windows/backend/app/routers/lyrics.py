import httpx
from fastapi import APIRouter, HTTPException, Query

from app.schemas.schemas import LyricsOut
from app.services import lyrics_service

router = APIRouter(tags=["lyrics"])


@router.get("/lyrics", response_model=LyricsOut)
async def lyrics(
    track: str = Query(..., min_length=1),
    artist: str = Query(...),
    dur: int | None = Query(None, description="Track duration in seconds"),
    album: str | None = Query(None),
) -> LyricsOut:
    try:
        result = await lyrics_service.get_lyrics(track, artist, dur, album)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"lrclib.net request failed: {e}")
    if result is None:
        raise HTTPException(404, "No lyrics found")
    return result
