"""CSV playlist import — ports the Android app's BackupRestoreViewModel CSV pipeline.

Parsing mirrors importPlaylistFromCsv/normalizeCsvHeaderCell: flexible header
detection (falls back to column 0/1 when no title/artist header is found), and
Exportify-style multi-artist splitting on ";"/"|". Matching mirrors
AddToPlaylistDialogOnline.processSongs: first YTM search result wins, up to 5
rows resolved concurrently.
"""

import asyncio
import csv
import io

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import LocalPlaylist
from app.schemas.schemas import SongIn
from app.services import library_service, ytmusic_service

_TITLE_HEADERS = {"title", "tracktitle", "songtitle"}
_ARTIST_HEADERS = {"artist", "artists", "artistname"}
_MAX_CONCURRENT_SEARCHES = 5


def _normalize_header_cell(value: str) -> str:
    return value.strip().lstrip("﻿").lower().replace(" ", "").replace("_", "").replace("-", "")


def parse_csv_songs(text: str) -> list[tuple[str, list[str]]]:
    """Return (title, artists) pairs parsed from raw CSV text, skipping blank titles."""
    rows = list(csv.reader(io.StringIO(text)))
    rows = [r for r in rows if any(cell.strip() for cell in r)]
    if not rows:
        return []

    title_idx, artist_idx = 0, 1
    data_rows = rows
    header = [_normalize_header_cell(c) for c in rows[0]]
    header_title_idx = next((i for i, c in enumerate(header) if c in _TITLE_HEADERS), None)
    header_artist_idx = next((i for i, c in enumerate(header) if c in _ARTIST_HEADERS), None)
    if header_title_idx is not None and header_artist_idx is not None:
        title_idx, artist_idx = header_title_idx, header_artist_idx
        data_rows = rows[1:]

    songs: list[tuple[str, list[str]]] = []
    for row in data_rows:
        title = row[title_idx].strip() if title_idx < len(row) else ""
        if not title:
            continue
        artist_cell = row[artist_idx].strip() if artist_idx < len(row) else ""
        artists = [a.strip() for a in artist_cell.replace("|", ";").split(";") if a.strip()]
        songs.append((title, artists))
    return songs


async def _resolve(title: str, artists: list[str], sem: asyncio.Semaphore) -> SongIn | None:
    query = f"{title} - {', '.join(artists)}" if artists else title
    async with sem:
        try:
            results = await ytmusic_service.search(query, "songs")
        except Exception:
            return None
    match = next((r for r in results if r.video_id), None)
    if not match:
        return None
    return SongIn(
        video_id=match.video_id,
        title=match.title,
        artist=match.subtitle or ", ".join(artists),
        thumbnail_url=match.thumbnail_url,
        duration=match.duration,
    )


class CsvImportResult:
    def __init__(
        self,
        playlist: LocalPlaylist,
        total: int,
        success: int,
        failed_titles: list[str],
    ):
        self.playlist = playlist
        self.total = total
        self.success = success
        self.failed_titles = failed_titles


async def import_csv(
    session: AsyncSession, playlist_name: str, rows: list[tuple[str, list[str]]]
) -> CsvImportResult:
    sem = asyncio.Semaphore(_MAX_CONCURRENT_SEARCHES)
    matches = await asyncio.gather(*(_resolve(title, artists, sem) for title, artists in rows))

    playlist = await library_service.create_playlist(session, playlist_name)
    failed_titles: list[str] = []
    success = 0
    for (title, _artists), match in zip(rows, matches):
        if match is None:
            failed_titles.append(title)
            continue
        await library_service.add_to_playlist(session, playlist.id, match)
        success += 1

    return CsvImportResult(
        playlist=playlist, total=len(rows), success=success, failed_titles=failed_titles
    )
