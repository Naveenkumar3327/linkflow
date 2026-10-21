"""Comprehensive automated test suite for URL Shortener."""
import os
import sqlite3
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_db
import app.services as services


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Set up an isolated temporary SQLite database for each test."""
    test_db_path = str(tmp_path / "test_urls.db")
    monkeypatch.setenv("DATABASE_PATH", test_db_path)
    monkeypatch.setenv("BASE_URL", "http://localhost:8000")
    init_db(test_db_path)
    yield test_db_path


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


def test_1_successful_url_shortening(client):
    """1. Verify successful URL shortening returns 201 and expected data."""
    target_url = "https://example.com/products/electronics"
    response = client.post("/api/shorten", json={"url": target_url})

    assert response.status_code == 201
    data = response.json()
    assert data["original_url"] == target_url
    assert "short_code" in data
    assert len(data["short_code"]) >= 6
    assert data["short_url"] == f"http://localhost:8000/{data['short_code']}"


def test_2_http_201_response_and_valid_response_fields(client):
    """2. Verify HTTP 201 status and complete response schema fields."""
    url = "https://fastapi.tiangolo.com/tutorial/"
    response = client.post("/api/shorten", json={"url": url})

    assert response.status_code == 201
    data = response.json()
    assert set(data.keys()) == {"short_code", "short_url", "original_url"}
    assert isinstance(data["short_code"], str)
    assert isinstance(data["short_url"], str)
    assert isinstance(data["original_url"], str)


def test_3_unique_codes_for_different_url_submissions(client):
    """3. Verify unique codes are generated for different URL submissions."""
    url1 = "https://example.com/page-one"
    url2 = "https://example.com/page-two"

    res1 = client.post("/api/shorten", json={"url": url1})
    res2 = client.post("/api/shorten", json={"url": url2})

    assert res1.status_code == 201
    assert res2.status_code == 201
    code1 = res1.json()["short_code"]
    code2 = res2.json()["short_code"]
    assert code1 != code2


def test_4_correct_redirect_destination_for_valid_code(client):
    """4. Verify HTTP 302 redirect points to the exact stored original URL."""
    target_url = "https://python.org/downloads/release/python-3140/"
    res_create = client.post("/api/shorten", json={"url": target_url})
    code = res_create.json()["short_code"]

    res_redirect = client.get(f"/{code}", follow_redirects=False)

    assert res_redirect.status_code == 302
    assert res_redirect.headers["location"] == target_url


def test_5_http_404_for_unknown_code(client):
    """5. Verify HTTP 404 is returned for an unknown short code."""
    response = client.get("/nonExistentCode99", follow_redirects=False)

    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert data["detail"] == "Short code not found"


def test_6_rejection_of_malformed_urls(client):
    """6. Verify rejection of malformed URLs with 4xx responses."""
    malformed_urls = [
        "not-a-valid-url",
        "http://",
        "https://",
        "://missing-scheme",
        "   ",
        "",
    ]

    for bad_url in malformed_urls:
        response = client.post("/api/shorten", json={"url": bad_url})
        assert response.status_code in (400, 422), f"Failed for {bad_url}"


def test_7_rejection_of_unsupported_url_schemes(client):
    """7. Verify rejection of unsupported URL schemes such as javascript:, ftp:, file:."""
    unsupported_urls = [
        "javascript:alert(1)",
        "javascript:void(0)",
        "ftp://ftp.example.com/file.txt",
        "file:///C:/Windows/System32/calc.exe",
        "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==",
    ]

    for bad_scheme_url in unsupported_urls:
        response = client.post("/api/shorten", json={"url": bad_scheme_url})
        assert response.status_code in (400, 422), f"Failed for {bad_scheme_url}"


def test_8_persistence_of_url_mappings_across_connections(setup_test_db, client):
    """8. Verify URL mappings persist across separate database connections and restarts."""
    test_db_path = setup_test_db
    target_url = "https://example.com/persistent-test"

    # Shorten via API client
    res = client.post("/api/shorten", json={"url": target_url})
    code = res.json()["short_code"]

    # Open a completely independent SQLite connection to inspect persisted data
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT short_code, original_url, created_at FROM urls WHERE short_code = ?", (code,))
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    assert row["short_code"] == code
    assert row["original_url"] == target_url
    assert row["created_at"] is not None

    # Verify that a subsequent redirect query still succeeds
    redirect_res = client.get(f"/{code}", follow_redirects=False)
    assert redirect_res.status_code == 302
    assert redirect_res.headers["location"] == target_url


def test_9_independent_storage_of_multiple_urls(client):
    """9. Verify independent storage and accurate resolution of multiple URLs."""
    urls = [
        "https://example.com/alpha",
        "https://example.com/beta",
        "https://example.com/gamma",
    ]

    mappings = {}
    for u in urls:
        resp = client.post("/api/shorten", json={"url": u})
        assert resp.status_code == 201
        mappings[resp.json()["short_code"]] = u

    # Check each resolves to its distinct original destination
    for code, original in mappings.items():
        resp = client.get(f"/{code}", follow_redirects=False)
        assert resp.status_code == 302
        assert resp.headers["location"] == original


def test_10_safe_handling_of_code_collisions(setup_test_db, monkeypatch):
    """10. Verify collision handling retries and recovers from uniqueness conflicts."""
    test_db_path = setup_test_db

    # Insert an initial entry manually to guarantee a conflict
    target_url_1 = "https://example.com/first"
    target_url_2 = "https://example.com/second"
    collision_code = "collide123"

    with get_db(test_db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO urls (short_code, original_url) VALUES (?, ?)",
            (collision_code, target_url_1),
        )

    # Monkeypatch generate_short_code to return collision_code first, then unique code
    call_count = 0

    def mock_generate_code(length=None):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return collision_code
        return "resolved456"

    monkeypatch.setattr(services, "generate_short_code", mock_generate_code)

    # Calling create_short_url should catch IntegrityError on 1st try and succeed on 2nd try
    result = services.create_short_url(target_url_2, db_path=test_db_path)
    assert result.short_code == "resolved456"
    assert result.original_url == target_url_2
    assert call_count == 2


def test_case_sensitivity_of_short_codes(client, setup_test_db):
    """Verify short codes are case-sensitive."""
    target_url = "https://example.com/case-sensitive"

    # Manually store with a specific case
    code_upper = "ABCxyz"
    with get_db(setup_test_db) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO urls (short_code, original_url) VALUES (?, ?)",
            (code_upper, target_url),
        )

    # Exact case must match
    res_exact = client.get(f"/{code_upper}", follow_redirects=False)
    assert res_exact.status_code == 302
    assert res_exact.headers["location"] == target_url

    # Differing case must return 404
    code_different_case = "abcXYZ"
    res_diff = client.get(f"/{code_different_case}", follow_redirects=False)
    assert res_diff.status_code == 404


def test_configurable_base_url(monkeypatch, client):
    """Verify short_url respects custom BASE_URL environment variable."""
    monkeypatch.setenv("BASE_URL", "https://sho.rt")
    response = client.post("/api/shorten", json={"url": "https://example.com/custom-base"})

    assert response.status_code == 201
    data = response.json()
    assert data["short_url"].startswith("https://sho.rt/")


def test_homepage_serves_html(client):
    """Verify GET / returns LinkFlow Studio web application with 200 status."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert ("LinkFlow Studio" in response.text) or ("Linkora" in response.text)


def test_legacy_homepage_still_accessible(client):
    """Verify GET /legacy continues to serve the fallback template."""
    response = client.get("/legacy")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "Linkora" in response.text
    assert "shorten-form" in response.text



def test_static_assets_accessible(client):
    """Verify static CSS and JS are served properly."""
    res_css = client.get("/static/css/style.css")
    assert res_css.status_code == 200
    assert "text/css" in res_css.headers.get("content-type", "")
    assert "--color-purple-600" in res_css.text

    res_js = client.get("/static/js/app.js")
    assert res_js.status_code == 200
    assert "/api/shorten" in res_js.text


def test_docs_still_accessible(client):
    """Verify /docs continues to serve the Swagger UI documentation."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger-ui" in response.text.lower()


def test_health_endpoint(client):
    """Verify /api/health returns database connectivity and stats."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "SQLite 3"
    assert "urls_count" in data
    assert isinstance(data["urls_count"], int)


def test_shorten_trace_successful_lifecycle(client):
    """Verify /api/shorten/trace executes real stages and records valid trace events."""
    target_url = "https://developer.mozilla.org/en-US/docs/Web/API"
    response = client.post("/api/shorten/trace", json={"url": target_url})

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["original_url"] == target_url
    assert data["short_code"] is not None
    assert len(data["short_code"]) >= 6
    assert data["short_url"] == f"http://localhost:8000/{data['short_code']}"
    assert data["total_duration_ms"] > 0

    steps = data["steps"]
    assert len(steps) == 5

    # Stage 1: Request Received
    assert steps[0]["stage"] == 1
    assert steps[0]["name"] == "REQUEST_RECEIVED"
    assert steps[0]["status"] == "completed"
    assert steps[0]["details"]["http_method"] == "POST"

    # Stage 2: URL Validation
    assert steps[1]["stage"] == 2
    assert steps[1]["name"] == "URL_VALIDATION"
    assert steps[1]["status"] == "completed"
    assert steps[1]["details"]["validation_outcome"] == "PASSED"
    assert steps[1]["details"]["scheme"] == "https"

    # Stage 3: Short-Code Generation
    assert steps[2]["stage"] == 3
    assert steps[2]["name"] == "CODE_GENERATION"
    assert steps[2]["status"] == "completed"
    assert steps[2]["details"]["generated_code"] == data["short_code"]

    # Stage 4: SQLite Persistence
    assert steps[3]["stage"] == 4
    assert steps[3]["name"] == "SQLITE_PERSISTENCE"
    assert steps[3]["status"] == "completed"
    assert steps[3]["details"]["target_table"] == "urls"
    assert steps[3]["details"]["transaction_status"] == "ACID COMMITTED"

    # Stage 5: Short URL Response
    assert steps[4]["stage"] == 5
    assert steps[4]["name"] == "SHORT_URL_RESPONSE"
    assert steps[4]["status"] == "completed"
    assert steps[4]["details"]["http_status"] == 201

    # Verify that the generated code is truly stored in SQLite and redirects
    redir_res = client.get(f"/{data['short_code']}", follow_redirects=False)
    assert redir_res.status_code == 302
    assert redir_res.headers["location"] == target_url


def test_shorten_trace_validation_failure(client):
    """Verify /api/shorten/trace halts at Stage 2 when URL is invalid."""
    invalid_url = "not-a-valid-http-url"
    response = client.post("/api/shorten/trace", json={"url": invalid_url})

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"] is not None
    assert data["short_code"] is None

    steps = data["steps"]
    assert len(steps) == 5

    # Stage 1 succeeded
    assert steps[0]["status"] == "completed"
    # Stage 2 failed
    assert steps[1]["status"] == "failed"
    assert steps[1]["error"] is not None
    # Subsequent stages are waiting/not completed
    assert steps[2]["status"] == "waiting"
    assert steps[3]["status"] == "waiting"
    assert steps[4]["status"] == "waiting"


def test_shorten_trace_query_param(client):
    """Verify /api/shorten?trace=true returns full trace schema."""
    target_url = "https://fastapi.tiangolo.com/benchmarks/"
    response = client.post("/api/shorten?trace=true", json={"url": target_url})

    assert response.status_code == 201
    data = response.json()
    assert "steps" in data
    assert len(data["steps"]) == 5
    assert data["success"] is True


