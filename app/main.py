"""Main FastAPI application entry point serving LinkFlow Studio API and Web Frontend."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.database import init_db
from app.routes import router

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
INDEX_HTML = os.path.join(TEMPLATES_DIR, "index.html")

FRONTEND_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")
FRONTEND_INDEX = os.path.join(FRONTEND_DIST, "index.html")
FRONTEND_ASSETS = os.path.join(FRONTEND_DIST, "assets")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to handle startup and shutdown tasks."""
    # Ensure database schema is initialized on application startup
    init_db()
    yield


app = FastAPI(
    title="LinkFlow Studio API",
    description="Interactive developer URL Shortener & Backend Execution Visualizer API.",
    version="1.0.0",
    lifespan=lifespan,
)

DEFAULT_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]


def get_allowed_origins() -> list[str]:
    """
    Return allowed CORS origins.
    Includes local development origins and configured deployed frontend origins.
    Strictly forbids wildcard or arbitrary origins in production.
    """
    origins = list(DEFAULT_DEV_ORIGINS)

    # Permit setting FRONTEND_URL or ALLOWED_ORIGINS / CORS_ORIGINS (comma-separated if multiple)
    for env_key in ("FRONTEND_URL", "ALLOWED_ORIGINS", "CORS_ORIGINS"):
        val = os.getenv(env_key)
        if val:
            for item in val.split(","):
                cleaned = item.strip().rstrip("/")
                if cleaned and cleaned not in origins:
                    origins.append(cleaned)

    return origins


class ProductionCORSMiddleware(CORSMiddleware):
    """
    CORS middleware that dynamically validates incoming request origin
    against the strictly configured whitelist without arbitrary wildcard fallbacks.
    """

    def is_allowed_origin(self, origin: str) -> bool:
        return origin in get_allowed_origins()


# Enable CORS strictly for local Vite development and deployed Vercel frontend origin
app.add_middleware(
    ProductionCORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Mount legacy static files (CSS, JS, assets)
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Mount built React frontend assets if present
if os.path.exists(FRONTEND_ASSETS):
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS), name="frontend_assets")


@app.get("/legacy", include_in_schema=False)
def serve_legacy_page():
    """Serve legacy template."""
    return FileResponse(INDEX_HTML, media_type="text/html")


@app.get("/", include_in_schema=False)
def serve_homepage():
    """Serve the user-facing web application homepage."""
    if os.path.exists(FRONTEND_INDEX) and not os.getenv("SERVE_LEGACY_HOMEPAGE"):
        return FileResponse(FRONTEND_INDEX, media_type="text/html")
    return FileResponse(INDEX_HTML, media_type="text/html")


@app.get("/how-it-works", include_in_schema=False)
def serve_how_it_works():
    """Serve client route for How It Works visualizer."""
    if os.path.exists(FRONTEND_INDEX):
        return FileResponse(FRONTEND_INDEX, media_type="text/html")
    return FileResponse(INDEX_HTML, media_type="text/html")


# Register API and redirection endpoints
app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=False)

