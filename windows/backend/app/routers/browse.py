from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.schemas import (
    AlbumOut,
    ArtistOut,
    BrowseItem,
    HomeSection,
    PlaylistOut,
    QueueOut,
    SearchHistoryIn,
    SearchHistoryOut,
    SearchSummaryOut,
    SongOut,
    SuggestionsOut,
)
from app.services import library_service, ytmusic_service
from app.services.ytmusic_service import VALID_SEARCH_FILTERS

router = APIRouter(tags=["browse"])


@router.get("/search/summary", response_model=SearchSummaryOut)
async def search_summary(q: str = Query(..., min_length=1)) -> SearchSummaryOut:
    try:
        return await ytmusic_service.search_summary(q)
    except Exception as e:
        raise HTTPException(502, f"YouTube Music search failed: {e}")


@router.get("/search/suggestions", response_model=SuggestionsOut)
async def search_suggestions(q: str = Query(..., min_length=1)) -> SuggestionsOut:
    try:
        return SuggestionsOut(suggestions=await ytmusic_service.get_search_suggestions(q))
    except Exception as e:
        raise HTTPException(502, f"Suggestions failed: {e}")


@router.get("/search/history", response_model=list[SearchHistoryOut])
async def search_history(
    limit: int = 20, session: AsyncSession = Depends(get_session)
) -> list[SearchHistoryOut]:
    rows = await library_service.get_search_history(session, limit)
    return [SearchHistoryOut.model_validate(r) for r in rows]


@router.post("/search/history", status_code=204)
async def add_search_history(
    body: SearchHistoryIn, session: AsyncSession = Depends(get_session)
) -> None:
    await library_service.add_search_history(session, body.query)


@router.delete("/search/history", status_code=204)
async def clear_search_history(session: AsyncSession = Depends(get_session)) -> None:
    await library_service.delete_search_history(session)


@router.delete("/search/history/{history_id}", status_code=204)
async def delete_search_history_item(
    history_id: int, session: AsyncSession = Depends(get_session)
) -> None:
    await library_service.delete_search_history(session, history_id)


@router.get("/search", response_model=list[BrowseItem])
async def search(
    q: str = Query(..., min_length=1),
    filter: str | None = Query(None),
) -> list[BrowseItem]:
    if filter and filter not in VALID_SEARCH_FILTERS:
        raise HTTPException(
            400, f"Invalid filter. Valid: {sorted(VALID_SEARCH_FILTERS)}"
        )
    try:
        return await ytmusic_service.search(q, filter)
    except Exception as e:
        raise HTTPException(502, f"YouTube Music search failed: {e}")


@router.get("/home", response_model=list[HomeSection])
async def home() -> list[HomeSection]:
    try:
        return await ytmusic_service.get_home()
    except Exception as e:
        raise HTTPException(502, f"YouTube Music home feed failed: {e}")


@router.get("/song/{video_id}", response_model=SongOut)
async def song(video_id: str) -> SongOut:
    try:
        return await ytmusic_service.get_song(video_id)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch song metadata: {e}")


@router.get("/queue/{video_id}", response_model=QueueOut)
async def queue(video_id: str, radio: bool = True) -> QueueOut:
    try:
        return await ytmusic_service.get_queue(video_id, radio)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch queue: {e}")


@router.get("/artist/{channel_id}", response_model=ArtistOut)
async def artist(channel_id: str) -> ArtistOut:
    try:
        return await ytmusic_service.get_artist(channel_id)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch artist: {e}")


@router.get("/album/{browse_id}", response_model=AlbumOut)
async def album(browse_id: str) -> AlbumOut:
    try:
        return await ytmusic_service.get_album(browse_id)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch album: {e}")


@router.get("/playlist/{playlist_id}", response_model=PlaylistOut)
async def playlist(playlist_id: str) -> PlaylistOut:
    try:
        return await ytmusic_service.get_playlist(playlist_id)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch playlist: {e}")
