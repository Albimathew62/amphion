"""Key-value app settings persisted in SQLite (AppSetting table)."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppSetting

KNOWN: dict[str, set[str]] = {
    "audioQuality": {"auto", "low", "high", "highest"},
}
DEFAULTS: dict[str, str] = {
    "audioQuality": "auto",
}


async def get_all(session: AsyncSession) -> dict[str, str]:
    values = dict(DEFAULTS)
    for key in DEFAULTS:
        row = await session.get(AppSetting, key)
        if row:
            values[key] = row.value
    return values


async def get_value(session: AsyncSession, key: str) -> str:
    row = await session.get(AppSetting, key)
    return row.value if row else DEFAULTS[key]


async def set_many(session: AsyncSession, updates: dict[str, str]) -> dict[str, str]:
    for key, value in updates.items():
        allowed = KNOWN.get(key)
        if allowed is None or value not in allowed:
            raise ValueError(f"Invalid setting {key}={value}")
        row = await session.get(AppSetting, key)
        if row:
            row.value = value
        else:
            session.add(AppSetting(key=key, value=value))
    await session.commit()
    return await get_all(session)
