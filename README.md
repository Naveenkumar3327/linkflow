# LinkFlow Studio — Production Deployment Guide

Interactive, developer-centric URL Shortener and backend execution visualizer built with **FastAPI**, **SQLite**, and **React (Vite + Tailwind CSS)**.

---

## 🏗️ Architecture Overview

| Component | Technology | Target Hosting | Storage / State |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | **Vercel** | Client-side SPA with Session History |
| **Backend** | Python 3.11+ / FastAPI / Uvicorn | **Render** (Web Service) | Stateless application layer |
| **Database** | SQLite 3 | **Render Persistent Disk** | Mount: `/var/data/urls.db` |

```
[ User Browser ]
       │
       ├──► (Static Assets / SPA) ──► [ Vercel Frontend ]
       │                                       │
       │                               (CORS-Whitelisted API Calls)
       │                                       ▼
       └──► (Short Link Redirects) ──► [ Render FastAPI Backend ]
                                               │
                                       (Persistent Disk Mount)
                                               ▼
                                      [ /var/data/urls.db ]
```

---

## 🚀 1. Backend Deployment (Render)

### Option A: 1-Click Render Blueprint (`render.yaml`)
This repository contains a pre-configured [`render.yaml`](render.yaml) file.
1. Connect your GitHub repository to [Render](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Select this repository. Render will automatically parse `render.yaml` and configure:
   - Python Web Service
   - Persistent Disk (`sqlite-data`, mounted to `/var/data`)
   - Environment variables: `DATABASE_PATH`, `BASE_URL`, `FRONTEND_URL`

> [!IMPORTANT]
> Persistent Disks on Render require a **Starter** instance type or higher (Render free-tier instances do not support persistent disk mounting).

### Option B: Manual Render Dashboard Setup
1. Log in to [Render Dashboard](https://dashboard.render.com) and click **New +** > **Web Service**.
2. Connect your GitHub repository (`linkflow`).
3. Set service settings:
   - **Name**: `linkflow-backend` (or your preferred name)
   - **Region**: Oregon (or your preferred region)
   - **Language**: Python 3
   - **Branch**: `main`
   - **Root Directory**: Leave blank (repo root)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Starter (required for persistent disk)
4. Add **Persistent Disk**:
   - Scroll to **Disks** > click **Add Disk**.
   - **Name**: `sqlite-data`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB` (or as needed)
5. Configure **Environment Variables** in the Render Dashboard:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_PATH` | `/var/data/urls.db` | Path to the SQLite database on the persistent disk mount |
   | `BASE_URL` | `https://your-service-name.onrender.com` | Public base URL used when constructing short link responses |
   | `FRONTEND_URL` | `https://your-frontend.vercel.app` | Exact origin of your deployed Vercel frontend for CORS |
   | `PYTHON_VERSION` | `3.11.8` | Supported Python runtime |

---

## ⚡ 2. Frontend Deployment (Vercel)

1. Log in to [Vercel](https://vercel.com) and click **Add New...** > **Project**.
2. Import your GitHub repository (`linkflow`).
3. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add **Environment Variables**:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://your-service-name.onrender.com` | The public URL of your deployed Render backend |
5. Click **Deploy**.

> [!NOTE]
> Client-side routing for `/` and `/how-it-works` is handled by [`frontend/vercel.json`](frontend/vercel.json) rewrite rules to prevent 404s on page refresh.

---

## 🔒 3. CORS Security Configuration

The FastAPI backend uses strict production CORS origin whitelisting in [`app/main.py`](app/main.py):
- **Development Origins**: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`, `http://localhost:8000`.
- **Production Origins**: Configured through `FRONTEND_URL` (or comma-separated `ALLOWED_ORIGINS`).
- **Arbitrary Origins**: Explicitly rejected without wildcards (`*`).

When the Vercel app is deployed, update `FRONTEND_URL` on Render to match your exact Vercel production domain:
```
FRONTEND_URL=https://your-app.vercel.app
```

---

## 💾 4. Persistent SQLite Storage & Lifespan

- The backend automatically initializes the database schema upon application startup via the FastAPI `lifespan` handler in [`app/main.py`](app/main.py).
- Tables and indexes are created with `CREATE TABLE IF NOT EXISTS urls` without overwriting or deleting any existing stored URLs.
- The parent mount directory (`/var/data` on Render or `data/` locally) is automatically created if it does not already exist.
- Data persists across backend redeployments, scale operations, and service restarts as long as the Render disk remains mounted.

---

## 🧪 5. Post-Deployment Verification Tests

After deploying both services, run these verification steps:

### Test 1: Backend Health Check
```bash
curl -X GET https://your-backend.onrender.com/api/health
```
**Expected Response (HTTP 200)**:
```json
{
  "status": "ok",
  "database": "SQLite 3",
  "database_path": "/var/data/urls.db",
  "urls_count": 0
}
```

### Test 2: Create a Short URL via API
```bash
curl -X POST https://your-backend.onrender.com/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://fastapi.tiangolo.com"}'
```
**Expected Response (HTTP 201)**:
```json
{
  "short_code": "aB12cD",
  "short_url": "https://your-backend.onrender.com/aB12cD",
  "original_url": "https://fastapi.tiangolo.com"
}
```

### Test 3: Short Code Redirection (HTTP 302)
```bash
curl -I https://your-backend.onrender.com/aB12cD
```
**Expected Response**:
```http
HTTP/1.1 302 Found
Location: https://fastapi.tiangolo.com
```

### Test 4: Unknown Code Error (HTTP 404)
```bash
curl -i https://your-backend.onrender.com/nonExistentCode99
```
**Expected Response**:
```http
HTTP/1.1 404 Not Found
{"detail":"Short code not found"}
```

### Test 5: Verify Frontend Interactivity
1. Open `https://your-frontend.vercel.app/` in your browser.
2. Shorten a link on the **Home** page. Confirm the generated URL uses your Render domain.
3. Navigate to **How It Works** and execute the 5-stage trace visualizer. Confirm all 5 stages complete with real duration metrics.
4. Test the **Test 404 Resolution** button on the How It Works page.

---

## 💻 Local Development

### 1. Backend Setup
```bash
# Activate virtual environment
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Vite proxies API requests to `http://127.0.0.1:8000`.

### 3. Run Automated Tests
```bash
pytest -v
```
All 33 automated tests verify:
- URL shortening and collision handling
- 5-stage trace pipeline
- Strict CORS rules and origin rejection
- SQLite persistence across restarts
- Configurable `DATABASE_PATH` and `BASE_URL`
- HTTP 302 redirects and 404 handlers

---

## 📋 Remaining Manual Hosting Steps

1. **Push Code to GitHub**:
   Push this repository to GitHub (`https://github.com/Naveenkumar3327/linkflow.git`).
2. **Deploy Backend to Render**:
   - Create a Web Service connected to the GitHub repo.
   - Attach a persistent disk (`/var/data`, 1 GB).
   - Set environment variables (`DATABASE_PATH=/var/data/urls.db`, `BASE_URL`, `FRONTEND_URL`).
3. **Deploy Frontend to Vercel**:
   - Create a new project connected to the GitHub repo.
   - Set Root Directory to `frontend`.
   - Set environment variable `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`.
4. **Link CORS Origin**:
   - Once Vercel assigns your production domain (e.g., `https://linkflow.vercel.app`), update `FRONTEND_URL` in your Render Web Service environment settings so the backend allows requests from that exact origin.
