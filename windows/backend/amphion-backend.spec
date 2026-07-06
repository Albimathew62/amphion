# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the Amphion FastAPI backend.

Produces a single self-contained exe used as the Tauri sidecar. Build with:
    pyinstaller amphion-backend.spec --noconfirm

The output name matches the Tauri externalBin target-triple convention so it can
be copied straight into src-tauri/binaries/.
"""

from PyInstaller.utils.hooks import collect_all, collect_data_files

datas = []
binaries = []
hiddenimports = [
    # aiosqlite is reached only via the "sqlite+aiosqlite" engine URL string.
    "aiosqlite",
    "sqlalchemy.dialects.sqlite",
    # uvicorn resolves these lazily via "auto" indirection.
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.websockets_impl",
    "uvicorn.protocols.websockets.wsproto_impl",
    "uvicorn.lifespan.on",
    "websockets",
    "wsproto",
    # python-multipart, used by the CSV upload endpoint via Form/UploadFile.
    "multipart",
    "python_multipart",
]

# ytmusicapi and yt-dlp ship data files + large dynamic module trees.
for pkg in ("ytmusicapi", "yt_dlp"):
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

# certifi CA bundle (httpx / ytmusicapi / yt-dlp TLS).
datas += collect_data_files("certifi")


a = Analysis(
    ["run.py"],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="amphion-backend-x86_64-pc-windows-msvc",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
