from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import init_db
from app.routers import browse, downloads, library, lyrics, settings as settings_router, stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.downloads_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="Amphion Windows API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(browse.router)
app.include_router(stream.router)
app.include_router(lyrics.router)
app.include_router(library.router)
app.include_router(downloads.router)
app.include_router(settings_router.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
