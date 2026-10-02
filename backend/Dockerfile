# Alpine (musl), not slim (Debian glibc): glibc 2.34+ starts threads with the
# clone3 syscall, which the seccomp profile of Docker before 20.10.10 rejects
# with EPERM instead of ENOSYS. On such hosts (Docker Toolbox on Windows 7
# ships 19.03) every thread fails to start: pip during the build and uvicorn
# with aiosqlite at runtime. musl does not use clone3.
FROM python:3.12-alpine


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