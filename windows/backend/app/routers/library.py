from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.schemas import (
    CsvImportOut,
    HistoryIn,
    HistoryItemOut,
    LikedSongOut,
    LikeOut,
    LocalPlaylistDetailOut,
    LocalPlaylistOut,
    PlaylistCreateIn,
    PlaylistImportIn,
    PlaylistSyncOut,
    SongIn,
    SongOut,
)
from app.services import csv_import_service, library_service, ytmusic_service

router = APIRouter(tags=["library"])


@router.post("/library/like/{video_id}", response_model=LikeOut)
async def toggle_like(
    video_id: str, song: SongIn, session: AsyncSession = Depends(get_session)
) -> LikeOut:
    if song.video_id != video_id:
        raise HTTPException(400, "videoId in path and body must match")
    liked = await library_service.toggle_like(session, song)
    return LikeOut(video_id=video_id, liked=liked)


@router.get("/library/like/{video_id}", response_model=LikeOut)
async def like_status(
    video_id: str, session: AsyncSession = Depends(get_session)
) -> LikeOut:
    liked = await library_service.is_liked(session, video_id)
    return LikeOut(video_id=video_id, liked=liked)


@router.get("/library/liked", response_model=list[LikedSongOut])
async def liked(session: AsyncSession = Depends(get_session)) -> list[LikedSongOut]:
    rows = await library_service.get_liked(session)
    return [
        LikedSongOut(song=SongOut.model_validate(song), liked_at=like.liked_at)
        for song, like in rows
    ]


@router.get("/history", response_model=list[HistoryItemOut])
async def history(
    limit: int = 100, session: AsyncSession = Depends(get_session)
) -> list[HistoryItemOut]:
    rows = await library_service.get_history(session, limit)
    return [
        HistoryItemOut(song=SongOut.model_validate(song), played_at=event.played_at)
        for song, event in rows
    ]


@router.post("/history/{video_id}", status_code=204)
async def record_play(
    video_id: str, body: HistoryIn, session: AsyncSession = Depends(get_session)
) -> None:
    if body.song.video_id != video_id:
        raise HTTPException(400, "videoId in path and body must match")
    await library_service.add_history(session, body.song, body.play_time)


@router.post("/library/playlists/import", response_model=LocalPlaylistOut)
async def import_playlist(
    body: PlaylistImportIn, session: AsyncSession = Depends(get_session)
) -> LocalPlaylistOut:
    pid = ytmusic_service.parse_playlist_id(body.playlist_id)
    if not pid:
        raise HTTPException(400, "Invalid playlist ID or URL")
    try:
        remote = await ytmusic_service.get_playlist(pid)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch remote playlist: {e}")
    playlist, count = await library_service.import_playlist(session, remote, pid)
    return LocalPlaylistOut(
        id=playlist.id,
        name=playlist.name,
        created_at=playlist.created_at,
        song_count=count,
        browse_id=playlist.browse_id,
    )


@router.post("/library/playlists/import-csv", response_model=CsvImportOut)
async def import_playlist_csv(
    name: str = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> CsvImportOut:
    raw = await file.read()
    text = raw.decode("utf-8-sig", errors="replace")
    rows = csv_import_service.parse_csv_songs(text)
    if not rows:
        raise HTTPException(
            400, "No songs found in this CSV — make sure it has Title/Artist columns."
        )
    result = await csv_import_service.import_csv(session, name, rows)
    return CsvImportOut(
        playlist=LocalPlaylistOut(
            id=result.playlist.id,
            name=result.playlist.name,
            created_at=result.playlist.created_at,
            song_count=result.success,
            browse_id=result.playlist.browse_id,
        ),
        total=result.total,
        success=result.success,
        failed=len(result.failed_titles),
        failed_titles=result.failed_titles,
    )


@router.post("/library/playlists/{playlist_id}/sync", response_model=PlaylistSyncOut)
async def sync_playlist(
    playlist_id: int, session: AsyncSession = Depends(get_session)
) -> PlaylistSyncOut:
    playlist = await library_service.get_playlist(session, playlist_id)
    if playlist is None:
        raise HTTPException(404, "Playlist not found")
    if not playlist.browse_id:
        raise HTTPException(400, "Playlist is local-only (no remote source to sync)")
    try:
        remote = await ytmusic_service.get_playlist(playlist.browse_id)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch remote playlist: {e}")
    added, removed = await library_service.sync_playlist(session, playlist_id, remote)
    return PlaylistSyncOut(added=added, removed=removed)


@router.post("/library/playlists", response_model=LocalPlaylistOut)
async def create_playlist(
    body: PlaylistCreateIn, session: AsyncSession = Depends(get_session)
) -> LocalPlaylistOut:
    playlist = await library_service.create_playlist(session, body.name)
    return LocalPlaylistOut(
        id=playlist.id, name=playlist.name, created_at=playlist.created_at
    )


@router.get("/library/playlists", response_model=list[LocalPlaylistOut])
async def playlists(
    session: AsyncSession = Depends(get_session),
) -> list[LocalPlaylistOut]:
    rows = await library_service.list_playlists(session)
    return [
        LocalPlaylistOut(
            id=p.id,
            name=p.name,
            created_at=p.created_at,
            song_count=count,
            browse_id=p.browse_id,
        )
        for p, count in rows
    ]


@router.get("/library/playlists/{playlist_id}", response_model=LocalPlaylistDetailOut)
async def playlist_detail(
    playlist_id: int, session: AsyncSession = Depends(get_session)
) -> LocalPlaylistDetailOut:
    playlist = await library_service.get_playlist(session, playlist_id)
    if playlist is None:
        raise HTTPException(404, "Playlist not found")
    songs = await library_service.get_playlist_songs(session, playlist_id)
    return LocalPlaylistDetailOut(
        id=playlist.id,
        name=playlist.name,
        created_at=playlist.created_at,
        browse_id=playlist.browse_id,
        songs=[SongOut.model_validate(s) for s in songs],
    )


@router.post("/library/playlists/{playlist_id}/songs", status_code=201)
async def add_song_to_playlist(
    playlist_id: int, song: SongIn, session: AsyncSession = Depends(get_session)
) -> dict:
    playlist = await library_service.get_playlist(session, playlist_id)
    if playlist is None:
        raise HTTPException(404, "Playlist not found")
    added = await library_service.add_to_playlist(session, playlist_id, song)
    return {"added": added}


@router.delete("/library/playlists/{playlist_id}", status_code=204)
async def delete_playlist(
    playlist_id: int, session: AsyncSession = Depends(get_session)
) -> None:
    await library_service.delete_playlist(session, playlist_id)
