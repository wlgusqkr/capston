#!/usr/bin/env bash
# 슬기로운 자취생활 — VM 배포 스크립트.
# GitHub Actions가 SSH로 호출. 항상 ~/slgi 에서 실행된다고 가정.
# 멱등(idempotent)하게 작성 — 재실행해도 안전.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

log() { printf "\n\033[1;34m[deploy]\033[0m %s\n" "$*"; }

# ---------------------------------------------------------------------------
# 0. PATH 보강 (uv는 ~/.local/bin, nvm은 ~/.nvm)
# ---------------------------------------------------------------------------
export PATH="$HOME/.local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi

# ---------------------------------------------------------------------------
# 1. 인프라 (DB + Redis) — 이미 떠있으면 no-op
# ---------------------------------------------------------------------------
log "infra: docker compose up -d (db, redis)"
cd "${PROJECT_ROOT}"
docker compose up -d db redis

# DB가 살아날 때까지 대기 (최대 30초)
for i in {1..30}; do
  if docker compose exec -T db pg_isready -U slgi -d slgi >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# 2. 백엔드
# ---------------------------------------------------------------------------
log "backend: uv sync"
cd "${BACKEND_DIR}"
uv sync

log "backend: migrate"
uv run python manage.py migrate --noinput

log "backend: collectstatic"
uv run python manage.py collectstatic --noinput

log "backend: restart gunicorn"
sudo systemctl restart gunicorn

# ---------------------------------------------------------------------------
# 3. 프론트
# ---------------------------------------------------------------------------
log "frontend: npm ci"
cd "${FRONTEND_DIR}"
npm ci --no-audit --no-fund

log "frontend: build"
npm run build

# ---------------------------------------------------------------------------
# 4. nginx 리로드 (정적 파일 갱신 시 캐시 무효화 차원)
# ---------------------------------------------------------------------------
log "nginx: reload"
sudo systemctl reload nginx

log "deploy complete."
