FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app
COPY pyproject.toml ./
COPY src ./src

RUN python -m pip install --upgrade pip \
 && python -m pip install --prefix=/install .

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LOG_LEVEL=INFO \
    API_HOST=0.0.0.0 \
    API_PORT=8010

RUN groupadd --system app && useradd --system --gid app --home /home/app --create-home app

COPY --from=builder /install /usr/local
WORKDIR /app
COPY alembic.ini ./alembic.ini
COPY --from=builder /app/src ./src

USER app
EXPOSE 8010

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; \
  sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8010/health', timeout=3).status == 200 else 1)"

CMD ["python", "-m", "uvicorn", "tothemoon_api.main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8010"]
