<div align="center">

<img src="windows/frontend/public/logo-mark.png" width="110" alt="Amphion" />

# 🎵 Amphion

### The YouTube Music player for Windows you always wanted

 No Ads •  No Subscription •  Full Control

![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white&labelColor=18181B)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=18181B)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black&labelColor=18181B)
![Tauri](https://img.shields.io/badge/Tauri-24C8DB?style=for-the-badge&logo=tauri&logoColor=white&labelColor=18181B)

[![License](https://img.shields.io/github/license/Albimathew62/amphion?style=for-the-badge&labelColor=18181B&color=EF4444)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Albimathew62/amphion?style=for-the-badge&labelColor=18181B&color=F59E0B)](https://github.com/Albimathew62/amphion/stargazers)
[![Release](https://img.shields.io/github/v/release/Albimathew62/amphion?style=for-the-badge&labelColor=18181B&color=3B82F6)](https://github.com/Albimathew62/amphion/releases/latest)
[![Last commit](https://img.shields.io/github/last-commit/Albimathew62/amphion?style=for-the-badge&labelColor=18181B&color=10B981)](https://github.com/Albimathew62/amphion/commits)

</div>

---

##  What is Amphion?

**Amphion** is a native Windows desktop music player for **YouTube Music** — a spiritual
port of the open-source Android app [Velune](https://github.com/nikhilvishwakarma00/Velune),
rebuilt from the ground up in Python, React, and Tauri.

It talks to YouTube Music for search, metadata, and streams, keeps your library locally in
SQLite, and pulls synced lyrics from lrclib.net — no ads, no login required, no telemetry.

>  This is YouTube Music — *but unlocked, on your desktop.*

---

##  Download

Grab the latest Windows installer from the
**[Releases page](https://github.com/Albimathew62/amphion/releases/latest)**
(`Amphion_x64-setup.exe`).

> The installer is unsigned, so Windows SmartScreen may warn "Windows protected your PC" →
> click **More info → Run anyway**. It installs per-user (no admin needed) and runs the
> backend automatically — no extra setup.

---

##  Features

### Core
- Search songs, albums, artists & playlists
- Personalized home feed & radio autoplay
- Local library — liked songs, play history, custom playlists
- Import your existing YouTube Music playlists
- Downloads for offline playback

###  Audio Engine
- Gapless playback
- Crossfade (tunable)
- Loudness normalization (EBU R128)
- Quality tiers (Auto / Low / High / Highest)

###  Interface
- Clean, dark **Material 3**-inspired UI (Poppins + Material Symbols)
- Adaptive full-screen player — background tinted from the album artwork
- Real-time **synced lyrics** with active-line highlight
- Mini player, full-screen player, queue & lyrics panels
- Add any song to a playlist from the menu **or** the full-screen player

---

##  Tech Stack

| Layer | Stack |
|------|------|
| Backend | Python · FastAPI · ytmusicapi · yt-dlp · SQLAlchemy (aiosqlite) |
| Frontend | React (Vite) · TypeScript · Tailwind CSS · Zustand |
| Desktop shell | Tauri (Rust) — backend bundled as a PyInstaller sidecar |
| Database | SQLite (liked songs, history, playlists, downloads) |
| Lyrics | lrclib.net |

**Architecture**

```
React UI (Tauri webview)
   │  HTTP (localhost:8000)
   ▼
FastAPI backend
   ├── ytmusicapi  → search, metadata, home, playlists, radio
   ├── yt-dlp      → stream URL extraction (googlevideo CDN)
   ├── SQLAlchemy  → local library (liked, history, playlists, queue)
   └── httpx       → lyrics from lrclib.net
```

---

##  Project Structure

```
amphion/
├── windows/
│   ├── backend/          # FastAPI + ytmusicapi + yt-dlp (Python)
│   │   ├── app/          # routers, services, db models
│   │   ├── run.py        # backend entry point / PyInstaller target
│   │   └── requirements.txt
│   ├── frontend/         # React + Vite + Tailwind
│   │   ├── src/          # UI, components, stores
│   │   └── src-tauri/    # Tauri (Rust) desktop shell
│   ├── build.ps1         # one-command build → NSIS installer
│   └── README.md
└── LICENSE               # GPL-3.0
```

---

##  Getting Started

**Prerequisites:** Windows 10/11 · Python 3.11+ · Node.js 20+ · Rust toolchain · WebView2
(preinstalled on Windows 11).

**Clone**
```powershell
git clone https://github.com/Albimathew62/amphion.git
cd amphion
```

**One-time backend setup**
```powershell
cd windows\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

**Run in development**
```powershell
# Terminal 1 — backend
cd windows\backend
.\.venv\Scripts\python.exe run.py

# Terminal 2 — frontend (browser dev) …
cd windows\frontend
npm install
npm run dev
# … or run the full desktop app (auto-starts the backend sidecar):
npx tauri dev
```

**Build the installer**
```powershell
powershell -ExecutionPolicy Bypass -File windows\build.ps1
# → windows\frontend\src-tauri\target\release\bundle\nsis\Amphion_x64-setup.exe
```

See [`windows/README.md`](windows/README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

---

##  Credits

Amphion stands on the shoulders of great open-source projects:

- **[Velune](https://github.com/nikhilvishwakarma00/Velune)** — the Android app whose
  architecture and logic Amphion was ported from
- **[ytmusicapi](https://github.com/sigma67/ytmusicapi)** — YouTube Music API
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — stream extraction
- **[lrclib.net](https://lrclib.net)** — synced lyrics
- Inspiration from **SimpMusic**, **InnerTune**, and **Metrolist**

---

##  Legal

Amphion is an independent client and is **not affiliated with YouTube or Google**. Please
support artists through official platforms ❤️

Copyright (C) 2026 Albi Mathew.

Amphion is free software: it is a derivative work of **Velune** and is licensed under the
**GNU General Public License v3.0** — see [`LICENSE`](LICENSE). You may redistribute and/or
modify it under those terms.
