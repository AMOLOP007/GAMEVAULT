# 🎮 GameVault – Universal Game Tracker & Library Manager

A cross-platform system to track all your games, log playtime automatically, manage achievements, and view analytics — all in one unified library.

---

## 📋 Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | ≥ 20.x | [nodejs.org](https://nodejs.org) |
| **Docker Desktop** | Latest | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com) |

### Installing Docker Desktop (Windows)

1. Download Docker Desktop from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Run the installer (requires admin rights)
3. **Enable WSL 2 backend** when prompted (recommended)
4. Restart your computer when prompted
5. Open Docker Desktop and wait for it to start (whale icon in system tray turns green)
6. Verify installation:
   ```powershell
   docker --version
   docker-compose --version
   ```

> **Note**: Docker Desktop requires Windows 10/11 64-bit with WSL 2 or Hyper-V enabled. The installer will guide you through enabling these features.

---

## 🔑 API Keys Setup Guide

### 1. RAWG API Key (Free – 20,000 requests/month)

1. Go to [rawg.io/apidocs](https://rawg.io/apidocs)
2. Click **Get API Key**
3. Create a free account (no credit card needed)
4. Your API key appears on the dashboard
5. Paste into `.env.local` as `RAWG_API_KEY`

> **Rate Limit**: 20,000 requests/month on the free tier. The app caches responses to stay well within limits.

### 2. IGDB API (via Twitch – Free, 4 req/sec)

1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console)
2. Log in or create a Twitch account
3. Enable **Two-Factor Authentication** on your Twitch account (required)
4. Click **Register Your Application**
5. Fill in:
   - **Name**: GameVault (or any name)
   - **OAuth Redirect URLs**: `http://localhost:3000`
   - **Category**: Application Integration
6. Click **Create**
7. Click **Manage** on your new application
8. Copy the **Client ID** → paste as `IGDB_CLIENT_ID`
9. Click **New Secret** → copy the **Client Secret** → paste as `IGDB_CLIENT_SECRET`

> **Rate Limit**: 4 requests/second. The app implements request throttling automatically.

### API Key Rate Limit Summary

| API | Free Tier Limit | Credit Card? | Used For |
|-----|----------------|--------------|----------|
| RAWG | 20,000/month | No | Game metadata, covers, genres |
| IGDB | 4/second | No | Game metadata (backup source) |

> **Note**: All API keys are optional for Phase 1. The app works without them – you can add games manually.

---

## 🚀 Quick Start

### 1. Clone and Install

```powershell
cd d:\GAMEVAULT
npm install
```

### 2. Start Database

```powershell
docker-compose up -d
```

### 3. Configure Environment

```powershell
# Copy the example env file (already done if you cloned the repo)
copy .env.example .env.local
# Edit .env.local with your values
```

### 4. Run Database Migrations

```powershell
npm run db:push
npm run db:seed
```

### 5. Start Development Servers

```powershell
# Terminal 1 – API Server
npm run dev:api

# Terminal 2 – Web Frontend
npm run dev:web
```

### 6. Open the App

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:3001](http://localhost:3001)
- **pgAdmin**: [http://localhost:5050](http://localhost:5050) (admin@gamevault.dev / admin)

---

## 📁 Project Structure

```
gamevault/
├── apps/
│   ├── web/          → Next.js 15 frontend
│   ├── api/          → Express.js REST API
│   └── desktop/      → Electron game tracker
├── packages/
│   └── shared/       → Shared types & constants
├── database/
│   ├── schema.prisma → Database schema
│   └── seed.ts       → Seed data
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🧪 Running Tests

```powershell
npm test
```

---

## 📄 License

MIT
