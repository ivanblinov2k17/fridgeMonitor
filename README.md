# Mock system for monitoring fridge temperatures
## Demo is available at 

https://fridge-monitor-ui.onrender.com/

first run could be slow and with blank data because of the host policies

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

Whole stack (API + frontend) in one command:

```

docker compose -f docker-compose.local.yml up --build

```

Open `http://<host>:8080` from any machine on the network: the frontend
proxies the API and the websocket, so the server's address does not need to
be configured anywhere and only port 8080 has to be reachable. SQLite is
persisted to `backend/data/`.

Port 8000 is published too, but only for reaching the API directly (`/docs`).

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEB_PORT` | `8080` | Port the frontend is published on |
| `API_URL` | empty (same origin) | Full address of a backend on another host |
| `CORS_ORIGINS` | `http://localhost:8080,http://localhost:5173` | Only matters for calls straight to port 8000 |

`API_URL` is baked into the bundle at build time, so changing it needs
`--build`, not just a restart.

Backend only:

```

cd backend
docker compose up --build

```

The root `docker-compose.yml` is the Timeweb deploy file and is backend-only
on purpose: that platform forbids volumes and proxies only the first service.

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

## Деплой на Timeweb Cloud (App Platform)

Timeweb настраивается через панель, конфига в репозитории не требуется.
Приложения создаются из одного репозитория, но по отдельности.

Бэкенд сначала — фронтенду нужен его адрес на этапе сборки.

**Бэкенд** (сборка из Docker Compose):

Панель ищет `docker-compose.yml` строго в корне репозитория — для этого он
там и лежит. Подпапку `backend` указать нельзя, путь к ней задан внутри
файла через `build.context`.

| Параметр | Значение |
| --- | --- |
| Файл сборки | `docker-compose.yml` в корне |
| Порт | берётся из `EXPOSE 8000`, панель `PORT` не передаёт |
| Healthcheck | `/` |
| Переменные | `CORS_ORIGINS` = адрес фронтенда |

Compose-режим запрещает `volumes`, поэтому корневой файл их не содержит, а
`backend/docker-compose.yml` с монтированием `./data` остаётся для локальной
разработки.

**Фронтенд** (тип «Фронтенд»):

| Параметр | Значение |
| --- | --- |
| Путь к директории проекта | `fridge-monitor-ui` |
| Команда сборки | `npm ci && npm run build` |
| Директория сборки | `dist` |
| Переменные | `VITE_API_URL` = адрес бэкенда |

«Директория сборки» складывается с путём к директории проекта, а не задаётся
от корня репозитория, как сказано в документации. Здесь итог — 
`fridge-monitor-ui/dist`. Если написать полный путь, сборка пройдёт успешно,
но статика распакуется пустой и сайт отдаст 404 на все запросы.

`VITE_API_URL` вшивается в бандл при сборке, поэтому после её изменения
фронтенд нужно пересобрать — правки одной переменной недостаточно.

Диск контейнера эфемерный: SQLite обнуляется при каждом редеплое.
