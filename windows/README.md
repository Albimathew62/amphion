# Amphion

Windows desktop YouTube Music client, inspired by the Velune Android app.
Python FastAPI backend + Vite React frontend (Tauri shell planned).

```
React UI (localhost:5173)
│  HTTP
▼
FastAPI backend (localhost:8000)
├── ytmusicapi   → search, home feed, song metadata, playlists
├── yt-dlp       → stream URL extraction (in-memory cache, ~6h expiry)
├── SQLAlchemy   → local library: liked songs, history, playlists (SQLite)
└── httpx        → synced lyrics from lrclib.net
```

## Run the backend

```powershell
cd windows\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Swagger UI: http://127.0.0.1:8000/docs
The SQLite DB (`amphion.db`) is created automatically on first start.

### Optional YouTube Music auth

Anonymous access covers search/home/stream. For personalized results, create a
`browser.json` with [ytmusicapi browser auth](https://ytmusicapi.readthedocs.io/en/stable/setup/browser.html)
and point the backend at it:

```powershell
$env:AMPHION_YTMUSIC_AUTH_FILE = "C:\path\to\browser.json"
```

## Run the frontend

Requires Node 20+.

```powershell
cd windows\frontend
npm install
npm run dev
```

Open http://localhost:5173 — search a song, click it, and audio plays in the
bottom player bar. Like (♡) saves to the local library; every play is recorded
in History; LYRICS opens a synced-lyrics panel.

## Build the desktop app (installer)

The desktop app is a Tauri v2 shell that wraps the built frontend and runs the
Python backend as a bundled PyInstaller **sidecar** (spawned/killed with the
window). One command builds everything into an NSIS installer:

```powershell
powershell -ExecutionPolicy Bypass -File windows\build.ps1
```

This (1) freezes the backend to `amphion-backend-x86_64-pc-windows-msvc.exe`,
(2) copies it into `frontend\src-tauri\binaries\`, and (3) runs `tauri build`.
The installer lands at:

```
windows\frontend\src-tauri\target\release\bundle\nsis\Amphion_0.2.0_x64-setup.exe
```

**Prerequisites:** Rust toolchain, Node 20+, the backend `.venv` (see above), and
the [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/)
(preinstalled on Windows 11).

**Iterate on the shell** without a full build:

```powershell
cd windows\frontend
npx tauri dev   # requires binaries\amphion-backend-<triple>.exe to exist first
```

The build is **unsigned** — testers get a SmartScreen warning (see
[BETA_TESTERS.md](BETA_TESTERS.md)). When packaged, the SQLite DB and downloads
live under `%LOCALAPPDATA%\Amphion` (not next to the exe).

## API overview

| Endpoint | Purpose |
| --- | --- |
| `GET /search?q=&filter=` | YouTube Music search (`songs`, `albums`, `artists`, `playlists`, …) |
| `GET /home` | Home feed sections |
| `GET /song/{videoId}` | Song metadata |
| `GET /stream/{videoId}` | Resolved audio stream URL (`?redirect=1` to 307) |
| `GET /playlist/{playlistId}` | Remote YTM playlist |
| `GET /lyrics?track=&artist=&dur=` | Synced/plain lyrics via lrclib.net |
| `POST /library/like/{videoId}` | Toggle like (body: song JSON) |
| `GET /library/liked` | Liked songs |
| `GET /history` / `POST /history/{videoId}` | Playback history |
| `GET/POST /library/playlists` (+`/{id}/songs`) | Local playlists |

## Notes

- Stream URLs expire after ~6 hours; the backend caches them in memory only and
  re-extracts on expiry. First extraction per song takes a few seconds.
- yt-dlp breaks when YouTube changes things — keep it updated:
  `.\.venv\Scripts\python.exe -m pip install -U yt-dlp` (then rebuild the
  installer, since the packaged app pins the bundled yt-dlp version).
