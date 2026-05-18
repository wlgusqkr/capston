FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgdal-dev \
        libgeos-dev \
        libproj-dev \
        binutils \
        gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./
RUN pip install .

COPY . .

EXPOSE 8000

# opentelemetry-instrument로 래핑 — 환경변수 OTEL_EXPORTER_OTLP_ENDPOINT 등이
# 없으면 자동 계측만 활성화되고 export는 비활성(시작 실패 X). 운영 환경에서만
# .env로 OTLP endpoint 주입하면 trace 전송 시작.
CMD ["opentelemetry-instrument", \
     "gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
