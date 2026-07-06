"""ytmusicapi wrapper — replaces Velune's :innertube module.

ytmusicapi is synchronous (requests-based), so every call goes through
asyncio.to_thread. Response shapes drift as YouTube changes markup, so
normalizers are defensive (.get everywhere, skip unparseable items).
"""

import asyncio
from functools import lru_cache
from urllib.parse import parse_qs, urlparse

from ytmusicapi import YTMusic

from app.config import settings
from app.schemas.schemas import (
    AlbumOut,
    ArtistOut,
    ArtistSection,
    BrowseItem,
    HomeSection,
    PlaylistOut,
    QueueOut,
    SearchSection,
    SearchSummaryOut,
    SongOut,
)

VALID_SEARCH_FILTERS = {
    "songs",
    "videos",
    "albums",
    "artists",
    "playlists",
    "community_playlists",
    "featured_playlists",
}


@lru_cache(maxsize=1)
def _client() -> YTMusic:
    auth = settings.ytmusic_auth_file
    if auth and auth.exists():
        return YTMusic(str(auth))
    return YTMusic()


def _thumbnail(item: dict) -> str | None:
    # get_watch_playlist uses the singular "thumbnail" key
    thumbs = item.get("thumbnails") or item.get("thumbnail") or []
    if thumbs and isinstance(thumbs, list):
        return thumbs[-1].get("url")
    return None


def _parse_length(value) -> int:
    """Parse "m:ss" / "h:mm:ss" duration strings to seconds."""
    if isinstance(value, (int, float)):
        return int(value)
    if not isinstance(value, str):
        return 0
    try:
        parts = [int(p) for p in value.split(":")]
    except ValueError:
        return 0
    seconds = 0
    for part in parts:
        seconds = seconds * 60 + part
    return seconds


_TYPE_WORDS = {"Song", "Video", "Album", "Artist", "Playlist", "Episode", "Single", "EP"}


def _artists_text(item: dict) -> str:
    artists = item.get("artists") or []
    names = [
        a.get("name", "")
        for a in artists
        if isinstance(a, dict)
        and a.get("name")
        # Unfiltered search injects the result type as a fake artist with no id
        and not (a.get("id") is None and a["name"] in _TYPE_WORDS)
    ]
    return ", ".join(names)


def _normalize_item(item: dict) -> BrowseItem | None:
    if not isinstance(item, dict):
        return None
    # Artist search results carry the name in "artist" (or "name") instead of "title"
    title = item.get("title") or item.get("artist") or item.get("name")
    if not title:
        return None

    video_id = item.get("videoId")
    playlist_id = item.get("playlistId")
    browse_id = item.get("browseId")
    result_type = item.get("resultType") or item.get("category")

    if video_id:
        item_type = "video" if result_type == "video" else "song"
    elif result_type == "artist" or (browse_id or "").startswith("UC"):
        item_type = "artist"
    elif result_type == "album" or (browse_id or "").startswith("MPRE"):
        item_type = "album"
    elif playlist_id or result_type == "playlist" or (browse_id or "").startswith("VL"):
        item_type = "playlist"
    else:
        return None

    subtitle = _artists_text(item) or item.get("author") or item.get("year")
    if isinstance(subtitle, int):
        subtitle = str(subtitle)

    return BrowseItem(
        type=item_type,
        video_id=video_id,
        browse_id=browse_id,
        playlist_id=playlist_id,
        title=title,
        subtitle=subtitle or None,
        thumbnail_url=_thumbnail(item),
        duration=item.get("duration_seconds") or 0,
    )


async def search(query: str, filter_: str | None = None) -> list[BrowseItem]:
    results = await asyncio.to_thread(_client().search, query, filter_)
    items = [_normalize_item(r) for r in results]
    return [i for i in items if i]


SUMMARY_FALLBACK_FILTERS = [
    ("Songs", "songs"),
    ("Videos", "videos"),
    ("Albums", "albums"),
    ("Artists", "artists"),
    ("Playlists", "community_playlists"),
]


async def search_summary(query: str) -> SearchSummaryOut:
    """Per-filter searches composed into sections — mirrors Android's searchSummary.

    Always composes from filtered searches: ytmusicapi's unfiltered search
    returns lossy items (fake "Song" artist entries, missing durations).
    """

    async def one(title: str, filter_: str) -> SearchSection | None:
        try:
            results = await asyncio.to_thread(_client().search, query, filter_, None, 8)
        except Exception:
            return None
        items = [i for i in (_normalize_item(r) for r in results or []) if i]
        return SearchSection(title=title, items=items[:8]) if items else None

    sections = await asyncio.gather(
        *(one(title, f) for title, f in SUMMARY_FALLBACK_FILTERS)
    )
    return SearchSummaryOut(sections=[s for s in sections if s])


async def get_search_suggestions(query: str) -> list[str]:
    results = await asyncio.to_thread(_client().get_search_suggestions, query)
    return [s for s in results or [] if isinstance(s, str)]


async def get_queue(video_id: str, radio: bool = True) -> QueueOut:
    """Up-next / radio queue — ports Android's YouTubeQueue (next endpoint)."""
    data = await asyncio.to_thread(
        _client().get_watch_playlist, videoId=video_id, radio=radio
    )
    items: list[SongOut] = []
    for track in data.get("tracks") or []:
        if not isinstance(track, dict) or not track.get("videoId"):
            continue
        album = track.get("album")
        items.append(
            SongOut(
                video_id=track["videoId"],
                title=track.get("title") or "",
                artist=_artists_text(track),
                album=album.get("name") if isinstance(album, dict) else None,
                thumbnail_url=_thumbnail(track),
                duration=_parse_length(track.get("length") or 0),
            )
        )
    return QueueOut(playlist_id=data.get("playlistId"), items=items)


async def get_artist(channel_id: str) -> ArtistOut:
    data = await asyncio.to_thread(_client().get_artist, channel_id)
    sections: list[ArtistSection] = []

    songs = (data.get("songs") or {}).get("results") or []
    song_items = [i for i in (_normalize_item(s) for s in songs) if i]
    if song_items:
        sections.append(ArtistSection(title="Songs", items=song_items))

    for key, title in (
        ("albums", "Albums"),
        ("singles", "Singles"),
        ("videos", "Videos"),
        ("related", "Fans might also like"),
    ):
        results = (data.get(key) or {}).get("results") or []
        items = [i for i in (_normalize_item(r) for r in results) if i]
        if items:
            sections.append(ArtistSection(title=title, items=items))

    thumbs = data.get("thumbnails") or []
    return ArtistOut(
        id=channel_id,
        title=data.get("name") or "",
        description=data.get("description"),
        thumbnail_url=thumbs[-1].get("url") if thumbs else None,
        sections=sections,
    )


async def get_album(browse_id: str) -> AlbumOut:
    data = await asyncio.to_thread(_client().get_album, browse_id)
    album_title = data.get("title") or ""
    album_thumb = _thumbnail(data)
    artist = _artists_text(data)
    songs: list[SongOut] = []
    for track in data.get("tracks") or []:
        if not isinstance(track, dict) or not track.get("videoId"):
            continue
        songs.append(
            SongOut(
                video_id=track["videoId"],
                title=track.get("title") or "",
                artist=_artists_text(track) or artist,
                album=album_title,
                thumbnail_url=_thumbnail(track) or album_thumb,
                duration=track.get("duration_seconds")
                or _parse_length(track.get("duration") or 0),
            )
        )
    year = data.get("year")
    try:
        year = int(year) if year is not None else None
    except (ValueError, TypeError):
        year = None
    return AlbumOut(
        id=browse_id,
        title=album_title,
        year=year,
        thumbnail_url=album_thumb,
        playlist_id=data.get("audioPlaylistId"),
        artist=artist or None,
        songs=songs,
    )


def parse_playlist_id(raw: str) -> str:
    """Accept a raw playlist ID or a full YouTube/YTM URL."""
    raw = raw.strip()
    if "list=" in raw:
        try:
            raw = parse_qs(urlparse(raw).query)["list"][0]
        except (KeyError, IndexError):
            pass
    return raw.removeprefix("VL")


async def get_home() -> list[HomeSection]:
    sections = await asyncio.to_thread(_client().get_home)
    out: list[HomeSection] = []
    for section in sections or []:
        if not isinstance(section, dict):
            continue
        items = [_normalize_item(i) for i in section.get("contents") or []]
        items = [i for i in items if i]
        if items:
            out.append(HomeSection(title=section.get("title") or "", items=items))
    return out


async def get_song(video_id: str) -> SongOut:
    data = await asyncio.to_thread(_client().get_song, video_id)
    details = data.get("videoDetails") or {}
    thumbs = (details.get("thumbnail") or {}).get("thumbnails") or []
    return SongOut(
        video_id=details.get("videoId") or video_id,
        title=details.get("title") or "",
        artist=details.get("author") or "",
        thumbnail_url=thumbs[-1].get("url") if thumbs else None,
        duration=int(details.get("lengthSeconds") or 0),
    )


async def get_playlist(playlist_id: str) -> PlaylistOut:
    data = await asyncio.to_thread(_client().get_playlist, playlist_id)
    songs: list[SongOut] = []
    for track in data.get("tracks") or []:
        if not isinstance(track, dict) or not track.get("videoId"):
            continue
        songs.append(
            SongOut(
                video_id=track["videoId"],
                title=track.get("title") or "",
                artist=_artists_text(track),
                album=(track.get("album") or {}).get("name") if track.get("album") else None,
                thumbnail_url=_thumbnail(track),
                duration=track.get("duration_seconds") or 0,
            )
        )
    return PlaylistOut(
        id=data.get("id") or playlist_id,
        title=data.get("title") or "",
        author=(data.get("author") or {}).get("name") if isinstance(data.get("author"), dict) else data.get("author"),
        thumbnail_url=_thumbnail(data),
        songs=songs,
    )
