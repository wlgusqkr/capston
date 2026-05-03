#!/usr/bin/env bash
# VM 1회성 부트스트랩.
# Ubuntu 22.04+ 가정 (GCP Compute Engine 표준 이미지).
# 멱등 — 다시 실행해도 안전.
#
# 사용법 (VM에 SSH 후):
#   git clone <repo-url> ~/slgi
#   cd ~/slgi
#   bash deploy/setup-vm.sh
#
# 그 다음 backend/.env, frontend/.env.production 채우고 GitHub Actions 활성화.

set -euo pipefail

PROJECT_ROOT="${HOME}/slgi"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

log() { printf "\n\033[1;32m[setup]\033[0m %s\n" "$*"; }

if [ ! -d "${PROJECT_ROOT}" ]; then
  echo "ERROR: ${PROJECT_ROOT} 가 없음. 먼저 git clone 하세요." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. 시스템 패키지
# ---------------------------------------------------------------------------
log "apt: 시스템 패키지 설치"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    build-essential curl ca-certificates git \
    python3 python3-dev python3-venv \
    libpq-dev gdal-bin libgdal-dev libgeos-dev \
    nginx \
    docker.io docker-compose-v2

# Docker 그룹에 사용자 추가 (이미 있으면 no-op)
if ! groups "$USER" | grep -q docker; then
  log "docker 그룹에 ${USER} 추가 (재로그인 필요)"
  sudo usermod -aG docker "$USER"
fi

# ---------------------------------------------------------------------------
# 2. uv (Python 의존성 매니저)
# ---------------------------------------------------------------------------
if ! command -v uv >/dev/null 2>&1; then
  log "uv 설치"
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="$HOME/.local/bin:$PATH"

# ---------------------------------------------------------------------------
# 3. nvm + Node LTS
# ---------------------------------------------------------------------------
if [ ! -s "$HOME/.nvm/nvm.sh" ]; then
  log "nvm 설치"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
# shellcheck disable=SC1091
. "$HOME/.nvm/nvm.sh"
if ! nvm ls --no-colors 2>/dev/null | grep -q "lts/"; then
  log "Node LTS 설치"
  nvm install --lts
  nvm alias default 'lts/*'
fi
nvm use --lts >/dev/null

# ---------------------------------------------------------------------------
# 4. .env 템플릿 — 없을 때만 복사
# ---------------------------------------------------------------------------
if [ ! -f "${BACKEND_DIR}/.env" ]; then
  log "backend/.env 생성 (수동으로 SECRET_KEY 등 채우세요)"
  cat > "${BACKEND_DIR}/.env" <<'EOF'
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=CHANGE_ME_TO_LONG_RANDOM_STRING
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=34.47.101.188,localhost,127.0.0.1
DATABASE_URL=postgis://slgi:slgi@localhost:5433/slgi
DJANGO_CORS_ALLOWED_ORIGINS=http://34.47.101.188
REDIS_URL=redis://localhost:6379/0
EOF
  echo "  → ${BACKEND_DIR}/.env 편집 후 다시 실행하세요."
fi

if [ ! -f "${FRONTEND_DIR}/.env.production" ]; then
  log "frontend/.env.production 생성"
  cat > "${FRONTEND_DIR}/.env.production" <<'EOF'
# 동일 오리진 nginx 프록시 사용 → 상대 경로
VITE_API_BASE_URL=/api
VITE_KAKAO_JS_KEY=
VITE_MAP_TILE_URL=
EOF
fi

# ---------------------------------------------------------------------------
# 5. 디렉토리 권한 (nginx www-data 가 dist/staticfiles 읽도록)
# ---------------------------------------------------------------------------
log "홈 디렉토리 실행 권한 부여 (nginx 읽기 위함)"
chmod o+x "${HOME}"
chmod o+x "${PROJECT_ROOT}"

# ---------------------------------------------------------------------------
# 6. 인프라 + 백엔드 + 프론트 초기 빌드
# ---------------------------------------------------------------------------
cd "${PROJECT_ROOT}"
log "docker compose: db + redis 기동"
docker compose up -d db redis
sleep 5

log "백엔드 의존성 + 마이그레이션 + collectstatic"
cd "${BACKEND_DIR}"
uv sync
uv run python manage.py migrate --noinput
uv run python manage.py collectstatic --noinput

log "프론트 의존성 + 빌드"
cd "${FRONTEND_DIR}"
npm ci --no-audit --no-fund
npm run build

# ---------------------------------------------------------------------------
# 7. systemd 유닛 (gunicorn)
# ---------------------------------------------------------------------------
log "gunicorn systemd 유닛 설치"
sudo install -m 644 "${PROJECT_ROOT}/deploy/gunicorn.service" /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
sudo systemctl enable gunicorn
sudo systemctl restart gunicorn

# ---------------------------------------------------------------------------
# 8. nginx 사이트 설정
# ---------------------------------------------------------------------------
log "nginx 사이트 설정"
sudo install -m 644 "${PROJECT_ROOT}/deploy/nginx.conf" /etc/nginx/sites-available/slgi
sudo ln -sf /etc/nginx/sites-available/slgi /etc/nginx/sites-enabled/slgi
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# ---------------------------------------------------------------------------
# 9. sudoers — deploy.sh 가 비밀번호 없이 systemctl 호출 가능하도록
# ---------------------------------------------------------------------------
SUDOERS_FILE=/etc/sudoers.d/slgi-deploy
if [ ! -f "${SUDOERS_FILE}" ]; then
  log "sudoers: ${USER} 에게 systemctl restart gunicorn / reload nginx 권한 부여"
  sudo tee "${SUDOERS_FILE}" >/dev/null <<EOF
${USER} ALL=(root) NOPASSWD: /bin/systemctl restart gunicorn, /bin/systemctl reload nginx, /usr/bin/systemctl restart gunicorn, /usr/bin/systemctl reload nginx
EOF
  sudo chmod 440 "${SUDOERS_FILE}"
fi

log "셋업 완료. http://34.47.101.188 접속 확인."
