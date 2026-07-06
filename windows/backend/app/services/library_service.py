"""Local library CRUD — ports Velune's DatabaseDao queries to SQLAlchemy."""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    LikedSong,
    LocalPlaylist,
    PlayHistory,
    PlaylistSong,
    SearchHistory,
    Song,
    utcnow,
)
from app.schemas.schemas import PlaylistOut, SongIn, SongOut


async def upsert_song(session: AsyncSession, song: SongIn) -> Song:
    existing = await session.get(Song, song.video_id)
    if existing:
        existing.title = song.title
        existing.artist = song.artist
        existing.album = song.album
        existing.thumbnail_url = song.thumbnail_url
        if song.duration:
            existing.duration = song.duration
        return existing
    row = Song(
        video_id=song.video_id,
        title=song.title,
        artist=song.artist,
        album=song.album,
        thumbnail_url=song.thumbnail_url,
        duration=song.duration,
    )
    session.add(row)
    return row


async def toggle_like(session: AsyncSession, song: SongIn) -> bool:
    await upsert_song(session, song)
    existing = await session.scalar(
        select(LikedSong).where(LikedSong.song_id == song.video_id)
    )
    if existing:
        await session.delete(existing)
        liked = False
    else:
        session.add(LikedSong(song_id=song.video_id))
        liked = True
    await session.commit()
    return liked


async def is_liked(session: AsyncSession, video_id: str) -> bool:
    return (
        await session.scalar(select(LikedSong).where(LikedSong.song_id == video_id))
    ) is not None


async def get_liked(session: AsyncSession) -> list[tuple[Song, LikedSong]]:
    result = await session.execute(
        select(Song, LikedSong)
        .join(LikedSong, LikedSong.song_id == Song.video_id)
        .order_by(LikedSong.liked_at.desc())
    )
    return list(result.tuples())


async def add_history(session: AsyncSession, song: SongIn, play_time: int = 0) -> None:
    await upsert_song(session, song)
    session.add(PlayHistory(song_id=song.video_id, play_time=play_time))
    await session.commit()


async def get_history(
    session: AsyncSession, limit: int = 100
) -> list[tuple[Song, PlayHistory]]:
    result = await session.execute(
        select(Song, PlayHistory)
        .join(PlayHistory, PlayHistory.song_id == Song.video_id)
        .order_by(PlayHistory.played_at.desc())
        .limit(limit)
    )
    return list(result.tuples())


async def create_playlist(session: AsyncSession, name: str) -> LocalPlaylist:
    playlist = LocalPlaylist(name=name)
    session.add(playlist)
    await session.commit()
    await session.refresh(playlist)
    return playlist


async def list_playlists(session: AsyncSession) -> list[tuple[LocalPlaylist, int]]:
    result = await session.execute(
        select(LocalPlaylist, func.count(PlaylistSong.id))
        .outerjoin(PlaylistSong, PlaylistSong.playlist_id == LocalPlaylist.id)
        .group_by(LocalPlaylist.id)
        .order_by(LocalPlaylist.created_at.desc())
    )
    return list(result.tuples())


async def get_playlist(session: AsyncSession, playlist_id: int) -> LocalPlaylist | None:
    return await session.get(LocalPlaylist, playlist_id)


async def get_playlist_songs(session: AsyncSession, playlist_id: int) -> list[Song]:
    result = await session.execute(
        select(Song)
        .join(PlaylistSong, PlaylistSong.song_id == Song.video_id)
        .where(PlaylistSong.playlist_id == playlist_id)
        .order_by(PlaylistSong.position)
    )
    return list(result.scalars())


async def add_to_playlist(
    session: AsyncSession, playlist_id: int, song: SongIn
) -> bool:
    await upsert_song(session, song)
    exists = await session.scalar(
        select(PlaylistSong).where(
            PlaylistSong.playlist_id == playlist_id,
            PlaylistSong.song_id == song.video_id,
        )
    )
    if exists:
        return False
    max_pos = await session.scalar(
        select(func.max(PlaylistSong.position)).where(
            PlaylistSong.playlist_id == playlist_id
        )
    )
    session.add(
        PlaylistSong(
            playlist_id=playlist_id,
            song_id=song.video_id,
            position=(max_pos if max_pos is not None else -1) + 1,
        )
    )
    await session.commit()
    return True


async def delete_playlist(session: AsyncSession, playlist_id: int) -> None:
    await session.execute(
        delete(PlaylistSong).where(PlaylistSong.playlist_id == playlist_id)
    )
    await session.execute(
        delete(LocalPlaylist).where(LocalPlaylist.id == playlist_id)
    )
    await session.commit()


def _song_in(song: SongOut) -> SongIn:
    return SongIn(
        video_id=song.video_id,
        title=song.title,
        artist=song.artist,
        album=song.album,
        thumbnail_url=song.thumbnail_url,
        duration=song.duration,
    )


async def import_playlist(
    session: AsyncSession, remote: PlaylistOut, browse_id: str
) -> tuple[LocalPlaylist, int]:
    """Import a remote YTM playlist into the local library (Android's save-to-library)."""
    playlist = LocalPlaylist(name=remote.title or browse_id, browse_id=browse_id)
    session.add(playlist)
    await session.flush()
    for position, song in enumerate(remote.songs):
        await upsert_song(session, _song_in(song))
        session.add(
            PlaylistSong(
                playlist_id=playlist.id, song_id=song.video_id, position=position
            )
        )
    await session.commit()
    await session.refresh(playlist)
    return playlist, len(remote.songs)


async def sync_playlist(
    session: AsyncSession, playlist_id: int, remote: PlaylistOut
) -> tuple[int, int]:
    """Diff local songs against remote and re-align (Android's syncPlaylist)."""
    result = await session.execute(
        select(PlaylistSong).where(PlaylistSong.playlist_id == playlist_id)
    )
    local_maps = {m.song_id: m for m in result.scalars()}
    remote_ids = [s.video_id for s in remote.songs]
    remote_set = set(remote_ids)

    removed = 0
    for song_id, mapping in local_maps.items():
        if song_id not in remote_set:
            await session.delete(mapping)
            removed += 1

    added = 0
    for position, song in enumerate(remote.songs):
        mapping = local_maps.get(song.video_id)
        if mapping:
            mapping.position = position
        else:
            await upsert_song(session, _song_in(song))
            session.add(
                PlaylistSong(
                    playlist_id=playlist_id,
                    song_id=song.video_id,
                    position=position,
                )
            )
            added += 1
    await session.commit()
    return added, removed


async def add_search_history(session: AsyncSession, query: str) -> None:
    query = query.strip()
    if not query:
        return
    existing = await session.scalar(
        select(SearchHistory).where(SearchHistory.query == query)
    )
    if existing:
        existing.created_at = utcnow()
    else:
        session.add(SearchHistory(query=query))
    await session.commit()


async def get_search_history(
    session: AsyncSession, limit: int = 20
) -> list[SearchHistory]:
    result = await session.execute(
        select(SearchHistory).order_by(SearchHistory.created_at.desc()).limit(limit)
    )
    return list(result.scalars())


async def delete_search_history(
    session: AsyncSession, history_id: int | None = None
) -> None:
    stmt = delete(SearchHistory)
    if history_id is not None:
        stmt = stmt.where(SearchHistory.id == history_id)
    await session.execute(stmt)
    await session.commit()
