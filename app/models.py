"""Domain models for the URL Shortener application."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class URLRecord:
    """Represents a persisted URL mapping in the database."""
    id: Optional[int]
    short_code: str
    original_url: str
    created_at: Optional[str] = None
