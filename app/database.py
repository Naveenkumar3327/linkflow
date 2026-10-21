"""Database initialization and connection management using SQLite."""
import os
import sqlite3
from contextlib import contextmanager
from typing import Generator, Optional

DEFAULT_DB_PATH = "data/urls.db"


def get_db_path() -> str:
    """Return configured database path from environment or default."""
    return os.getenv("DATABASE_PATH", DEFAULT_DB_PATH)


def init_db(db_path: Optional[str] = None) -> None:
    """Initialize SQLite database and create the required schema."""
    target_path = db_path or get_db_path()

    if target_path != ":memory:":
        parent_dir = os.path.dirname(target_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

    with get_db(target_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS urls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                short_code TEXT NOT NULL UNIQUE,
                original_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
            """
        )


@contextmanager
def get_db(db_path: Optional[str] = None) -> Generator[sqlite3.Connection, None, None]:
    """Provide a transactional SQLite database connection context."""
    target_path = db_path or get_db_path()

    if target_path != ":memory:":
        parent_dir = os.path.dirname(target_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
