"""API routes for URL shortening and redirection."""
import re
from typing import Union
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
from app.schemas import (
    ShortenRequest,
    ShortenResponse,
    ShortenTraceResponse,
    HealthResponse,
    ErrorResponse,
)
from app.services import (
    create_short_url,
    create_short_url_with_trace,
    get_url_by_code,
    get_database_stats,
)

router = APIRouter()

CODE_REGEX = re.compile(r"^[a-zA-Z0-9]+$")


@router.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Backend Health and SQLite Status",
    description="Check backend connectivity and verify SQLite database integrity and count.",
)
def health_endpoint() -> HealthResponse:
    """Return live backend and SQLite connection status."""
    stats = get_database_stats()
    return HealthResponse(
        status="ok",
        database=stats["database"],
        database_path=stats["database_path"],
        urls_count=stats["urls_count"],
    )


@router.post(
    "/api/shorten",
    response_model=Union[ShortenResponse, ShortenTraceResponse],
    status_code=status.HTTP_201_CREATED,
    responses={
        422: {"model": ErrorResponse, "description": "Validation Error / Unsupported Scheme"},
    },
    summary="Create Short URL",
    description="Accepts a long HTTP or HTTPS URL and returns a unique shortened code and URL. Supports optional trace query param.",
)
def shorten_url_endpoint(payload: ShortenRequest, trace: bool = False):
    """Create a new shortened URL mapping."""
    if trace:
        trace_res = create_short_url_with_trace(original_url=payload.url)
        if not trace_res.success:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content=trace_res.model_dump(),
            )
        return trace_res
    return create_short_url(original_url=payload.url)


@router.post(
    "/api/shorten/trace",
    response_model=ShortenTraceResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"model": ShortenTraceResponse, "description": "Successful URL shortening with full trace"},
        422: {"model": ShortenTraceResponse, "description": "Validation failed with full trace details"},
    },
    summary="Shorten URL with Real Execution Trace",
    description="Executes shortening and provides structured execution metrics for all 5 stages.",
)
async def shorten_with_trace_endpoint(request: Request):
    """
    Accepts URL payload and executes real shortening, returning real timestamps,
    validation details, collision checks, and SQLite write confirmation.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    raw_url = body.get("url") if isinstance(body, dict) else ""
    if raw_url is None:
        raw_url = ""

    trace_result = create_short_url_with_trace(raw_url=str(raw_url))
    if not trace_result.success:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=trace_result.model_dump(),
        )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=trace_result.model_dump(),
    )



@router.get(
    "/{code}",
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
    responses={
        302: {"description": "Redirect to the original stored URL"},
        404: {"model": ErrorResponse, "description": "Short code not found"},
    },
    summary="Resolve and Redirect",
    description="Resolves a short code and redirects (HTTP 302) to the original URL.",
)
def redirect_to_url(code: str):
    """
    Look up the short code and redirect to the stored original URL.
    Returns HTTP 404 if the code does not exist.
    """
    # Guard against invalid formats or reserved paths
    if not CODE_REGEX.match(code):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short code not found",
        )

    record = get_url_by_code(code)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short code not found",
        )

    # Security: Redirect ONLY to the destination stored in the database
    return RedirectResponse(
        url=record.original_url,
        status_code=status.HTTP_302_FOUND,
    )
