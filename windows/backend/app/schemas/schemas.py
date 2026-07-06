from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class SongOut(ApiModel):
    video_id: str
    title: str
    artist: str
    album: str | None = None
    thumbnail_url: str | None = None
    duration: int = 0


class SongIn(ApiModel):
    video_id: str
    title: str
    artist: str
    album: str | None = None
    thumbnail_url: str | None = None
    duration: int = 0


class BrowseItem(ApiModel):
    type: Literal["song", "video", "album", "playlist", "artist"]
    video_id: str | None = None
    browse_id: str | None = None
    playlist_id: str | None = None
    title: str
    subtitle: str | None = None
    thumbnail_url: str | None = None
    duration: int = 0


class HomeSection(ApiModel):
    title: str
    items: list[BrowseItem]


class StreamOut(ApiModel):
    video_id: str
    url: str
    expires_at: int  # unix seconds
    local: bool = False  # true when served from a downloaded file
    loudness: float | None = None  # integrated loudness in dB, for normalization


class SearchSection(ApiModel):
    title: str
    items: list[BrowseItem]


class SearchSummaryOut(ApiModel):
    sections: list[SearchSection]


class SuggestionsOut(ApiModel):
    suggestions: list[str]


class SearchHistoryIn(ApiModel):
    query: str


class SearchHistoryOut(ApiModel):
    id: int
    query: str
    created_at: datetime


class QueueOut(ApiModel):
    playlist_id: str | None = None
    items: list[SongOut]


class ArtistSection(ApiModel):
    title: str
    items: list[BrowseItem]


class ArtistOut(ApiModel):
    id: str
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    sections: list[ArtistSection]


class AlbumOut(ApiModel):
    id: str
    title: str
    year: int | None = None
    thumbnail_url: str | None = None
    playlist_id: str | None = None
    artist: str | None = None
    songs: list[SongOut]


class PlaylistImportIn(ApiModel):
    playlist_id: str  # raw ID or full YouTube/YTM URL


class PlaylistSyncOut(ApiModel):
    added: int
    removed: int


class LyricsLine(ApiModel):
    time_ms: int
    text: str


class LyricsOut(ApiModel):
    synced: bool
    lines: list[LyricsLine] | None = None
    plain: str | None = None


class PlaylistOut(ApiModel):
    id: str
    title: str
    author: str | None = None
    thumbnail_url: str | None = None
    songs: list[SongOut]


class LikeOut(ApiModel):
    video_id: str
    liked: bool


class LikedSongOut(ApiModel):
    song: SongOut
    liked_at: datetime


class HistoryItemOut(ApiModel):
    song: SongOut
    played_at: datetime


class HistoryIn(ApiModel):
    song: SongIn
    play_time: int = 0  # ms listened


class PlaylistCreateIn(ApiModel):
    name: str


class LocalPlaylistOut(ApiModel):
    id: int
    name: str
    created_at: datetime
    song_count: int = 0
    browse_id: str | None = None


class LocalPlaylistDetailOut(ApiModel):
    id: int
    name: str
    created_at: datetime
    browse_id: str | None = None
    songs: list[SongOut]


class CsvImportOut(ApiModel):
    playlist: LocalPlaylistOut
    total: int
    success: int
    failed: int
    failed_titles: list[str]
