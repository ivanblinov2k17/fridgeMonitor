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

### Old Docker (Windows 7, Docker Toolbox)

The local compose files work with Docker 19.03 and Compose 1.24, which is
what Docker Toolbox ships. Compose v1 has no `docker compose` subcommand, so
use the hyphenated binary:

```

docker-compose -f docker-compose.local.yml up -d --build

```

- The stack runs inside the Toolbox VirtualBox VM, so open
  `http://192.168.99.100:8080` (`docker-machine ip default` prints the
  address), not `localhost`.
- To open it from other computers on the network, forward port 8080 of the
  `default` VM in VirtualBox (Settings → Network → Adapter 1 (NAT) → Port
  Forwarding, host 8080 → guest 8080), then use the Windows machine's address.
- Toolbox shares only `C:\Users` with the VM, so keep the repository there or
  the `backend/data` volume will be empty.

Images built elsewhere can be carried over instead of building on the
server; the compose file names them `fridge-monitor-api` and
`fridge-monitor-ui`, so after loading them run `up` with `--no-build`:

```

docker save fridge-monitor-api fridge-monitor-ui -o fridge-monitor.tar
docker load -i fridge-monitor.tar
docker-compose -f docker-compose.local.yml up -d --no-build

```

## Real sensors (MV110 + MKON)

`docker-compose.local.yml` reads real sensors by default: the backend talks
Modbus TCP to the MKON gateway at `192.168.1.31`, which passes requests to
the MV110 modules on its RS-485 line.

- On start the backend tries every address in `MODBUS_UNITS` (default
  `2-16`; 1 is the gateway itself) and creates a device for every connected
  input of every module that answers. Afterwards it tries one more address
  per poll, so a module added to the line later shows up on its own.
- Inputs the module reports as switched off are not shown.
- A broken or shorted sensor, or a module that stopped answering, shows its
  state on the card instead of a temperature, and nothing is written to the
  history for it: the module keeps the last good value in its registers,
  and storing it would look like a real reading.
- Sensors are created as `Sensor 2.1` (module 2, input 1). Rename them to
  the chamber in the API docs at `http://<server>:8000/docs`,
  `PATCH /devices/{id}`.
- The first start on an existing database removes the mock devices and
  their random history.

Without the hardware, run the demo data instead:

```
POLLER=mock docker compose -f docker-compose.local.yml up
```

On Windows `cmd`, `set POLLER=mock` first. Other settings: `MODBUS_HOST`,
`MODBUS_PORT` (502), `MODBUS_TIMEOUT_SECONDS` (2) - see
`backend/app/core/config.py`.

To check the hardware without the stack, `tools/mv110_scan.py` finds the
module addresses and `tools/mv110_probe.py` prints one module's readings.

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
