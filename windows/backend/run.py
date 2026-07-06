"""Standalone launcher for the Amphion backend.

Used both for local runs (`python run.py`) and as the PyInstaller entry point
that gets frozen into the Tauri sidecar exe. `-m uvicorn` is not available inside
a frozen exe, so we call `uvicorn.run` directly with the imported app object.
"""

import multiprocessing

import uvicorn

from app.config import settings
from app.main import app


def main() -> None:
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="info")


if __name__ == "__main__":
    # Required so PyInstaller-frozen builds don't re-launch the app in child
    # processes spawned by any library that uses multiprocessing.
    multiprocessing.freeze_support()
    main()
