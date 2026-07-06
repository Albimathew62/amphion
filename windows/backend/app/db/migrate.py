"""Naive startup auto-migration — no Alembic.

create_all handles new tables; this adds columns missing from existing
tables. SQLite ALTER TABLE ADD COLUMN only supports constant defaults,
so all additions here are nullable.
"""

NEW_COLUMNS: dict[str, dict[str, str]] = {
    "song": {"date_download": "DATETIME"},
    "local_playlist": {"browse_id": "TEXT"},
}


async def auto_migrate(conn) -> None:
    for table, cols in NEW_COLUMNS.items():
        result = await conn.exec_driver_sql(f"PRAGMA table_info({table})")
        existing = {row[1] for row in result}
        if not existing:
            continue  # table doesn't exist yet; create_all handles it
        for col, ddl in cols.items():
            if col not in existing:
                await conn.exec_driver_sql(
                    f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"
                )
