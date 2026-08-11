FROM python:3.12-slim


WORKDIR /app


COPY requirements.txt .


RUN pip install --no-cache-dir \
    -r requirements.txt


COPY . .


# SQLite lives here. Mounted as a volume locally; ephemeral on Render.
RUN mkdir -p /app/data


EXPOSE 8000


# sh -c expands ${PORT} (injected by Render); exec keeps uvicorn as PID 1
# so it still receives SIGTERM on shutdown.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]