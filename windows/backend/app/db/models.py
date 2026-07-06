from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Song(Base):
    """Mirrors Velune's Room SongEntity (simplified)."""

    __tablename__ = "song"

    video_id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    artist: Mapped[str] = mapped_column(String)
    album: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    duration: Mapped[int] = mapped_column(Integer, default=0)  # seconds
    # Mirrors Android SongEntity.dateDownload — set when a local file exists
    date_download: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class LikedSong(Base):
    __tablename__ = "liked_song"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    song_id: Mapped[str] = mapped_column(ForeignKey("song.video_id"), unique=True)
    liked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PlayHistory(Base):
    """Mirrors Velune's Room `event` table (songId, timestamp, playTime)."""

    __tablename__ = "play_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    song_id: Mapped[str] = mapped_column(ForeignKey("song.video_id"))
    played_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    play_time: Mapped[int] = mapped_column(Integer, default=0)  # ms listened


class LocalPlaylist(Base):
    __tablename__ = "local_playlist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    # Remote YT playlist id when imported — enables re-sync (Android PlaylistEntity.browseId)
    browse_id: Mapped[str | None] = mapped_column(String, nullable=True)


class SearchHistory(Base):
    __tablename__ = "search_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    query: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AppSetting(Base):
    __tablename__ = "app_setting"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(String)


class PlaylistSong(Base):
    __tablename__ = "playlist_song"
    __table_args__ = (UniqueConstraint("playlist_id", "song_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    playlist_id: Mapped[int] = mapped_column(ForeignKey("local_playlist.id"))
    song_id: Mapped[str] = mapped_column(ForeignKey("song.video_id"))
    position: Mapped[int] = mapped_column(Integer, default=0)
