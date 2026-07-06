# Amphion — Beta Tester Guide

Thanks for testing Amphion, a desktop YouTube Music player for Windows.

## Getting the file intact (read first)

**Do not send the installer over WhatsApp / Telegram / Discord or other chat
apps** — they truncate or alter `.exe` files, which produces a
*"This app can't run on your PC"* error even on a fully compatible machine.

Share it via a **Google Drive / OneDrive / Dropbox link** (or a GitHub Release).
Those preserve the file exactly. A `.zip` sent through chat also works, since
chat apps leave zip contents untouched.

To confirm a clean download, the file should be **34,370,576 bytes** with SHA256:

```
02573b0874f6d03244b6ff71281ee53a90d13586afc4265776bf5c0b07b05bcc
```

Verify in PowerShell: `Get-FileHash .\Amphion_0.2.0_x64-setup.exe`. If it doesn't
match, the download is corrupt — download again.

## Install

1. Download **`Amphion_0.2.0_x64-setup.exe`**.
2. Double-click it. Windows may show a blue **"Windows protected your PC"**
   SmartScreen box because this beta is **not code-signed**. This is expected.
   - Click **More info**
   - Then click **Run anyway**
3. The installer runs (no admin rights needed — it installs for your user only)
   and adds **Amphion** to the Start menu.

## First launch

- Launch **Amphion** from the Start menu.
- On the very first start you'll briefly see a **"Starting Amphion…"** screen
  for a few seconds while the background music engine boots. This is normal.
- Search for a song, click it, and it should play in the bottom bar.

## What to try

- Search songs / artists / albums
- Play, pause, skip, seek; queue and shuffle/repeat
- **Like** a song (♡) → check the **Liked** page
- Open **Lyrics** on a playing song
- **Download** a song, then play it (works offline)
- **History** page after playing a few tracks

## Known beta limitations

- **Unsigned build** → the SmartScreen warning above on install/first run.
- **Requires internet** for search and streaming (downloads play offline).
- Uses local port **8000**. If another program already uses it, Amphion will
  show a "couldn't reach the engine" message — close that program (or reboot)
  and relaunch.
- Streaming relies on `yt-dlp`, which can break when YouTube changes things.
  If playback suddenly stops working across songs, report it — a new build with
  an updated `yt-dlp` fixes it.

## Where your data lives

Your library (liked songs, history, playlists) and downloads are stored at:

```
%LOCALAPPDATA%\Amphion
```

(paste that into the File Explorer address bar). To fully reset the app, close
it and delete that folder.

## Reporting bugs

Please include: what you did, what happened vs. what you expected, and whether
the "Starting Amphion…" screen ever got stuck.
