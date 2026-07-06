# 🛠️ Amphion — Engineering & Build Guide

This document covers setting up the Amphion development environment, the technology stack,
and how to build the Windows installer from source.

The entire desktop app lives under [`windows/`](windows/). The repository root also contains
the original **Velune** Android sources that Amphion was ported from — those are reference
only and are not part of the build.

---

## 🏗️ Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Windows | 10 / 11 | |
| Python | 3.11+ | backend + PyInstaller |
| Node.js | 20+ | frontend (Vite) |
| Rust | stable (MSVC toolchain) | Tauri shell |
| WebView2 | runtime | preinstalled on Windows 11 |

---

## 📐 Architecture

Amphion is three cooperating layers:

1. **Backend** (`windows/backend`) — an async **FastAPI** service on `127.0.0.1:8000`.
   - `ytmusicapi` → search, metadata, home feed, playlists, radio
   - `yt-dlp` → stream URL extraction (runs in a thread executor; never blocks the loop)
   - `SQLAlchemy` + `aiosqlite` → local library (liked, history, playlists, downloads)
   - `httpx` → lyrics from lrclib.net
2. **Frontend** (`windows/frontend`) — **React + Vite + TypeScript + Tailwind**, state via
   **Zustand**. Talks to the backend over HTTP only.
3. **Desktop shell** (`windows/frontend/src-tauri`) — **Tauri (Rust)** wraps the built
   frontend and spawns the backend as a **PyInstaller sidecar** exe on startup.

**Ground rules**
- Backend is async-first; keep blocking calls (yt-dlp) in a thread executor.
- Frontend never calls Python directly — only via the HTTP API.
- Auth stays optional; unauthenticated ytmusicapi must keep working.
- Never persist stream URLs — they expire (~6h) and are re-fetched per session.

---

## 🚀 Environment Setup

**Backend (one-time)**
```powershell
cd windows\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

**Frontend**
```powershell
cd windows\frontend
npm install
```

---

## 🧪 Running Locally

**Option A — browser dev (fast UI iteration)**
```powershell
# Terminal 1: backend
cd windows\backend
.\.venv\Scripts\python.exe run.py

# Terminal 2: Vite dev server
cd windows\frontend
npm run dev        # http://localhost:5173+
```
The UI shows "Starting Amphion…" until the backend answers `GET /health` on port 8000, so
the backend must be running.

**Option B — full desktop app**
```powershell
cd windows\frontend
npx tauri dev      # opens the Tauri window and auto-starts the backend sidecar
```
> `tauri dev` needs the sidecar binary to exist at
> `src-tauri\binaries\amphion-backend-x86_64-pc-windows-msvc.exe`. Run `build.ps1` once (or
> the PyInstaller step below) to produce it.

---

## 📦 Building the Installer

One command does everything — freezes the backend, copies the sidecar, builds the frontend,
and bundles the Tauri NSIS installer:

```powershell
powershell -ExecutionPolicy Bypass -File windows\build.ps1
```

Output: `windows\frontend\src-tauri\target\release\bundle\nsis\Amphion_x64-setup.exe`

Under the hood:
1. `PyInstaller amphion-backend.spec` → `windows\backend\dist\amphion-backend-<triple>.exe`
2. Copy sidecar → `windows\frontend\src-tauri\binaries\`
3. `npm run build` (`tsc -b && vite build`) → `windows\frontend\dist\`
4. `npx tauri build` → Rust shell + NSIS installer

---

## ✅ Before Opening a PR

- **Typecheck / build the frontend:** `cd windows\frontend && npm run build`
- Keep changes scoped to `windows/`; do not modify the root Android reference sources.
- Match the existing code style (async backend, Zustand stores, Tailwind utility classes).
- If you add a Python dependency, pin it in `requirements.txt` and add it to
  `amphion-backend.spec` hidden imports / `collect_all` if PyInstaller can't find it.

---

## ⚖️ License

Amphion is licensed under **GPL-3.0** (see [`LICENSE`](LICENSE)). By contributing, you agree
your contributions are licensed under the same terms.
