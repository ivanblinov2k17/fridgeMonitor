# Mock system for monitoring fridge temperatures

## To run locally :

```

cd backend
./.venv/scripts/activate
pip install requirements.txt
uvicorn app.main:app --reload

```
python version 3.14


```

cd fridge-monitor-ui
npm install
npm run dev

```

### With Docker

```

cd backend
docker compose up --build

```

API on http://localhost:8000, SQLite persisted to `backend/data/`.

## Configuration

Backend (`backend/.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/fridge.db` | Database location |
| `POLL_INTERVAL_SECONDS` | `5` | Mock poller interval |
| `DEFAULT_DEVICES_COUNT` | `10` | Devices seeded on startup |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

Frontend:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://127.0.0.1:8000` | Backend URL; websocket URL is derived from it |

## Deploying to Render

`render.yaml` defines both services on Render's free tier. Data is
ephemeral — SQLite resets on every deploy and restart.

1. Push this repo to GitHub.
2. In Render: **New > Blueprint**, select the repo. It picks up `render.yaml`.
3. Render prompts for the two `sync: false` variables. The URLs follow
   `https://<service-name>.onrender.com`, so unless the names are taken:
   - `CORS_ORIGINS` = `https://fridge-monitor-ui.onrender.com`
   - `VITE_API_URL` = `https://fridge-monitor-api.onrender.com`
4. Apply. If Render assigned different URLs, correct the two variables in each
   service's **Environment** tab and redeploy.

Note: free web services spin down after 15 minutes without traffic, so the
first request after an idle period takes ~1 minute. An open dashboard keeps
the service awake, since websocket messages count as traffic.
