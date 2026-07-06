from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.schemas import ApiModel
from app.services import settings_service

router = APIRouter(tags=["settings"])

AudioQuality = Literal["auto", "low", "high", "highest"]


class SettingsOut(ApiModel):
    audio_quality: AudioQuality


class SettingsPatch(ApiModel):
    audio_quality: AudioQuality | None = None


def _to_out(values: dict[str, str]) -> SettingsOut:
    return SettingsOut(audio_quality=values["audioQuality"])  # type: ignore[arg-type]


@router.get("/settings", response_model=SettingsOut)
async def get_settings(session: AsyncSession = Depends(get_session)) -> SettingsOut:
    return _to_out(await settings_service.get_all(session))


@router.patch("/settings", response_model=SettingsOut)
async def patch_settings(
    body: SettingsPatch, session: AsyncSession = Depends(get_session)
) -> SettingsOut:
    updates: dict[str, str] = {}
    if body.audio_quality is not None:
        updates["audioQuality"] = body.audio_quality
    if updates:
        return _to_out(await settings_service.set_many(session, updates))
    return _to_out(await settings_service.get_all(session))
