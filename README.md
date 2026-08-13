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
| Директория сборки | `fridge-monitor-ui/dist` — путь от корня репозитория, а не от директории проекта |
| Переменные | `VITE_API_URL` = адрес бэкенда |

`VITE_API_URL` вшивается в бандл при сборке, поэтому после её изменения
фронтенд нужно пересобрать — правки одной переменной недостаточно.

Диск контейнера эфемерный: SQLite обнуляется при каждом редеплое.
