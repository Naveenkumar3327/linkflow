"""Tests for production configuration, database persistence, CORS security, and redirects."""
import os
import sqlite3
import pytest
from fastapi.testclient import TestClient
from app.main import app, get_allowed_origins
from app.database import init_db, get_db, get_db_path
import app.services as services


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


# ============================================================================
# 1. CORS CONFIGURATION TESTS
# ============================================================================

def test_cors_allows_local_dev_origin(client):
    """Verify CORS permits standard local Vite dev origin."""
    response = client.get(
        "/api/health",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_allows_configured_vercel_origin(monkeypatch, client):
    """Verify CORS dynamically permits the exact deployed Vercel frontend origin."""
    vercel_url = "https://linkflow-frontend.vercel.app"
    monkeypatch.setenv("FRONTEND_URL", vercel_url)

    response = client.get(
        "/api/health",
        headers={"Origin": vercel_url},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == vercel_url
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_allows_multiple_comma_separated_origins(monkeypatch, client):
    """Verify CORS permits multiple origins specified in ALLOWED_ORIGINS."""
    monkeypatch.setenv(
        "ALLOWED_ORIGINS",
        "https://preview-1.vercel.app, https://preview-2.vercel.app",
    )

    r1 = client.get("/api/health", headers={"Origin": "https://preview-1.vercel.app"})
    assert r1.headers.get("access-control-allow-origin") == "https://preview-1.vercel.app"

    r2 = client.get("/api/health", headers={"Origin": "https://preview-2.vercel.app"})
    assert r2.headers.get("access-control-allow-origin") == "https://preview-2.vercel.app"


def test_cors_blocks_arbitrary_unauthorized_origin(monkeypatch, client):
    """Verify CORS strictly rejects arbitrary or untrusted origins in production."""
    monkeypatch.setenv("FRONTEND_URL", "https://trusted-site.vercel.app")

    response = client.get(
        "/api/health",
        headers={"Origin": "https://malicious-untrusted-site.com"},
    )
    assert response.status_code == 200
    # Access-Control-Allow-Origin MUST NOT be present for untrusted origin
    assert "access-control-allow-origin" not in response.headers


def test_cors_preflight_options_request(monkeypatch, client):
    """Verify preflight OPTIONS request returns expected CORS response headers."""
    vercel_url = "https://linkflow-production.vercel.app"
    monkeypatch.setenv("FRONTEND_URL", vercel_url)

    response = client.options(
        "/api/shorten",
        headers={
            "Origin": vercel_url,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == vercel_url
    assert "POST" in response.headers.get("access-control-allow-methods", "")


# ============================================================================
# 2. DATABASE PATH & PERSISTENCE TESTS
# ============================================================================

def test_custom_database_path_environment_variable(tmp_path, monkeypatch):
    """Verify DATABASE_PATH environment variable is respected."""
    custom_db = str(tmp_path / "custom_mount" / "production.db")
    monkeypatch.setenv("DATABASE_PATH", custom_db)

    assert get_db_path() == custom_db

    # Initialize schema and verify file creation in nested path
    init_db(custom_db)
    assert os.path.exists(custom_db)


def test_init_db_preserves_existing_records(tmp_path):
    """Verify init_db creates tables without deleting or overwriting existing records."""
    db_file = str(tmp_path / "persistent_test.db")
    init_db(db_file)

    # Insert test mapping
    with get_db(db_file) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO urls (short_code, original_url) VALUES (?, ?)",
            ("keep123", "https://keep-existing.org"),
        )

    # Re-run init_db multiple times (simulating service restart / container redeployment)
    init_db(db_file)
    init_db(db_file)

    # Verify record was preserved
    with get_db(db_file) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT original_url FROM urls WHERE short_code = ?", ("keep123",))
        row = cursor.fetchone()
        assert row is not None
        assert row["original_url"] == "https://keep-existing.org"


def test_persistence_across_connection_cycles(tmp_path, monkeypatch, client):
    """Verify created short URLs persist and can be resolved across restarts."""
    test_db = str(tmp_path / "simulated_disk" / "urls.db")
    monkeypatch.setenv("DATABASE_PATH", test_db)
    init_db(test_db)

    destination = "https://render.com/docs/disks"
    res = client.post("/api/shorten", json={"url": destination})
    assert res.status_code == 201
    code = res.json()["short_code"]

    # Verify resolution
    redir = client.get(f"/{code}", follow_redirects=False)
    assert redir.status_code == 302
    assert redir.headers["location"] == destination

    # Simulate container restart: re-initialize database and resolve again
    init_db(test_db)
    redir_after_restart = client.get(f"/{code}", follow_redirects=False)
    assert redir_after_restart.status_code == 302
    assert redir_after_restart.headers["location"] == destination


# ============================================================================
# 3. PUBLIC BASE URL RESOLUTION TESTS
# ============================================================================

def test_production_base_url_configuration(monkeypatch, client):
    """Verify generated short URLs use the configured public BASE_URL in production."""
    prod_backend = "https://linkflow-api.onrender.com"
    monkeypatch.setenv("BASE_URL", prod_backend)

    res = client.post("/api/shorten", json={"url": "https://fastapi.tiangolo.com"})
    assert res.status_code == 201
    short_url = res.json()["short_url"]
    assert short_url.startswith(prod_backend)
    assert "localhost" not in short_url


def test_render_external_url_fallback(monkeypatch, client):
    """Verify auto-fallback to RENDER_EXTERNAL_URL if BASE_URL is not explicitly set."""
    monkeypatch.delenv("BASE_URL", raising=False)
    render_url = "https://my-app-render.onrender.com"
    monkeypatch.setenv("RENDER_EXTERNAL_URL", render_url)

    res = client.post("/api/shorten", json={"url": "https://render.com"})
    assert res.status_code == 201
    short_url = res.json()["short_url"]
    assert short_url.startswith(render_url)
    assert "localhost" not in short_url


# ============================================================================
# 4. REDIRECT & 404 RESOLUTION TESTS
# ============================================================================

def test_redirect_302_to_exact_url(tmp_path, monkeypatch, client):
    """Verify valid short code returns HTTP 302 with Location header."""
    db_file = str(tmp_path / "redirect_test.db")
    monkeypatch.setenv("DATABASE_PATH", db_file)
    init_db(db_file)

    target = "https://github.com/fastapi/fastapi"
    res = client.post("/api/shorten", json={"url": target})
    code = res.json()["short_code"]

    res_redir = client.get(f"/{code}", follow_redirects=False)
    assert res_redir.status_code == 302
    assert res_redir.headers["location"] == target


def test_unknown_short_code_returns_404(client):
    """Verify unknown short code returns HTTP 404."""
    res = client.get("/nonExistentShortCode404", follow_redirects=False)
    assert res.status_code == 404
    assert res.json()["detail"] == "Short code not found"


def test_invalid_short_code_characters_return_404(client):
    """Verify short codes with invalid characters (non-alphanumeric) return HTTP 404."""
    invalid_codes = ["bad/slash", "bad.dot", "bad@code", "bad space"]
    for code in invalid_codes:
        res = client.get(f"/{code}", follow_redirects=False)
        assert res.status_code == 404
