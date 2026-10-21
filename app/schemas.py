"""Request and response schemas with strict URL validation."""
from urllib.parse import urlparse
from pydantic import BaseModel, field_validator


class ShortenRequest(BaseModel):
    """Payload for creating a shortened URL."""
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        if not value or not isinstance(value, str):
            raise ValueError("URL must be a non-empty string.")

        trimmed = value.strip()
        if not trimmed:
            raise ValueError("URL cannot be empty or whitespace.")

        try:
            parsed = urlparse(trimmed)
        except Exception as exc:
            raise ValueError(f"Malformed URL: {exc}") from exc

        scheme = (parsed.scheme or "").lower()
        if scheme not in ("http", "https"):
            raise ValueError(
                f"Unsupported URL scheme '{scheme}'. Only 'http' and 'https' are supported."
            )

        if not parsed.netloc:
            raise ValueError("URL must contain a valid domain or host.")

        return trimmed


class ShortenResponse(BaseModel):
    """Response payload for a successfully created short URL."""
    short_code: str
    short_url: str
    original_url: str


class ErrorResponse(BaseModel):
    """Standard error payload structure."""
    detail: str


class TraceStep(BaseModel):
    """Execution step recorded during real backend URL shortening processing."""
    stage: int
    name: str
    title: str
    status: str  # waiting, running, completed, failed
    started_at: str
    duration_ms: float
    details: dict
    error: str | None = None


class ShortenTraceResponse(BaseModel):
    """Full execution trace detailing all 5 backend stages."""
    success: bool
    total_duration_ms: float
    short_code: str | None = None
    short_url: str | None = None
    original_url: str
    steps: list[TraceStep]
    error: str | None = None


class HealthResponse(BaseModel):
    """Health check status and database connection verification."""
    status: str
    database: str
    database_path: str
    urls_count: int

