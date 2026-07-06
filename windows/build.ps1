<#
.SYNOPSIS
    Build the Amphion Windows installer end-to-end.

.DESCRIPTION
    1. Ensures PyInstaller is installed in the backend venv.
    2. Freezes the FastAPI backend into a single sidecar exe.
    3. Copies the exe into the Tauri sidecar location (target-triple named).
    4. Builds the frontend + Tauri app, producing an NSIS installer.

    Run from anywhere; paths are resolved relative to this script.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File windows\build.ps1
#>
$ErrorActionPreference = "Stop"

$root      = $PSScriptRoot
$backend   = Join-Path $root "backend"
$frontend  = Join-Path $root "frontend"
$venvPy    = Join-Path $backend ".venv\Scripts\python.exe"
$triple    = "x86_64-pc-windows-msvc"
$exeName   = "amphion-backend-$triple.exe"
$binaries  = Join-Path $frontend "src-tauri\binaries"

Write-Host "==> Amphion build starting" -ForegroundColor Cyan

if (-not (Test-Path $venvPy)) {
    throw "Backend venv not found at $venvPy. Create it first: py -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
}

# 1. PyInstaller present?
Write-Host "==> Ensuring PyInstaller is installed" -ForegroundColor Cyan
& $venvPy -m pip show pyinstaller *> $null
if ($LASTEXITCODE -ne 0) {
    & $venvPy -m pip install pyinstaller
}

# 2. Freeze the backend.
Write-Host "==> Freezing backend with PyInstaller" -ForegroundColor Cyan
Push-Location $backend
try {
    & $venvPy -m PyInstaller amphion-backend.spec --noconfirm --clean
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller build failed." }
}
finally { Pop-Location }

$builtExe = Join-Path $backend "dist\$exeName"
if (-not (Test-Path $builtExe)) { throw "Expected backend exe not found: $builtExe" }

# 3. Copy sidecar into place.
Write-Host "==> Copying sidecar -> $binaries" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $binaries | Out-Null
Copy-Item $builtExe (Join-Path $binaries $exeName) -Force

# 4. Build the Tauri app (frontend build runs via beforeBuildCommand).
Write-Host "==> Installing frontend deps + building Tauri app" -ForegroundColor Cyan
Push-Location $frontend
try {
    if (-not (Test-Path (Join-Path $frontend "node_modules"))) { npm install }
    npx tauri build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed." }
}
finally { Pop-Location }

$nsisDir = Join-Path $frontend "src-tauri\target\release\bundle\nsis"
$installer = Get-ChildItem -Path $nsisDir -Filter "*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

Write-Host ""
if ($installer) {
    Write-Host "==> DONE. Installer:" -ForegroundColor Green
    Write-Host "    $($installer.FullName)" -ForegroundColor Green
} else {
    Write-Host "==> Build finished but no NSIS installer found in $nsisDir" -ForegroundColor Yellow
}
