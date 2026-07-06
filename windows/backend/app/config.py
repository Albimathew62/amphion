import os
import sys
from pathlib import Path

from pydantic_settings import BaseSettings


def _data_dir() -> Path:
    """Writable directory for the DB and downloads.

    When frozen by PyInstaller, ``__file__`` points inside the read-only/ephemeral
    extraction dir, so persist under ``%LOCALAPPDATA%\\Amphion`` instead. In dev
    (running from source) keep the original source-relative location.
    """
    if getattr(sys, "frozen", False):
        base = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Amphion"
    else:
        base = Path(__file__).resolve().parent.parent
    base.mkdir(parents=True, exist_ok=True)
    return base


_DATA_DIR = _data_dir()


class Settings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 8000
    db_path: Path = _DATA_DIR / "amphion.db"
    # Optional ytmusicapi auth file (browser.json). Unauthenticated works for search/stream.
    ytmusic_auth_file: Path | None = None
    lrclib_base_url: str = "https://lrclib.net"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "tauri://localhost",
        # Windows WebView2 (Tauri v2) serves the bundled app from these origins.
        "http://tauri.localhost",
        "https://tauri.localhost",
    ]
    # Streams expire server-side (~6h); refresh this many seconds early.
    stream_cache_safety_seconds: int = 60
    downloads_dir: Path = _DATA_DIR / "downloads"
    default_audio_quality: str = "auto"

    model_config = {"env_prefix": "AMPHION_"}


settings = Settings()
