# 배포 (CI/CD)

GCP VM 1대(현재 `34.47.101.188`)에 프론트 + 백엔드를 동시 배포한다.
`main` 브랜치에 push하면 GitHub Actions가 SSH로 들어가 `deploy/deploy.sh` 실행.

## 구성

```
GitHub push (main)
      │
      ▼
GitHub Actions  ──ssh──▶  GCP VM
                          ├─ git pull
                          ├─ docker compose up (db, redis)
                          ├─ uv sync + migrate + collectstatic
                          ├─ systemctl restart gunicorn  (127.0.0.1:8000)
                          ├─ npm ci + npm run build  (frontend/dist)
                          └─ systemctl reload nginx
                                  │
                                  ▼
                          nginx :80
                          ├─ /            → frontend/dist (SPA)
                          ├─ /api,/admin  → gunicorn
                          └─ /static,/media → Django staticfiles
```

## 첫 셋업 (1회만)

### 1. VM 준비

```bash
ssh gcp-vm   # ~/.ssh/config 의 alias

# 레포 clone
git clone https://github.com/<owner>/<repo>.git ~/slgi
cd ~/slgi

# 부트스트랩 (apt, uv, nvm, docker, nginx, systemd)
bash deploy/setup-vm.sh
```

setup 스크립트가 자동 생성하는 `.env` 두 개를 편집:

- `~/slgi/backend/.env` — `DJANGO_SECRET_KEY` 를 긴 랜덤 문자열로 교체
- `~/slgi/frontend/.env.production` — 보통 그대로 OK (`VITE_API_BASE_URL=/api`)

편집 후 한 번 더:

```bash
bash deploy/setup-vm.sh   # 멱등 — 다시 돌려도 안전
```

### 2. GitHub Secrets 등록

레포 → Settings → Secrets and variables → Actions → New repository secret

| 이름 | 값 |
|------|-----|
| `SSH_HOST` | `34.47.101.188` |
| `SSH_USER` | `wlgusqkr22` |
| `SSH_PRIVATE_KEY` | `~/.ssh/findhomekey` 의 **전체 내용** (`-----BEGIN ... END-----` 포함) |

> `SSH_PRIVATE_KEY` 는 로컬에서 `cat ~/.ssh/findhomekey | pbcopy` 로 복사해 그대로 붙여넣기.

### 3. 트리거 확인

`backend/`, `frontend/`, `deploy/`, `.github/workflows/deploy.yml` 중 하나라도 변경되어 main에 push되면 워크플로우 발동.
수동 실행: Actions 탭 → Deploy to VM → Run workflow.

## 일상 배포

평소엔 그냥 `git push origin main` 한 번이면 끝.
빌드 로그는 GitHub Actions 페이지에서, 런타임 로그는 VM에서:

```bash
ssh gcp-vm
sudo journalctl -u gunicorn -f      # 백엔드 로그
sudo tail -f /var/log/nginx/access.log
docker compose logs -f db redis     # ~/slgi 에서
```

## 수동 디버깅

VM에서 배포 스크립트만 다시 돌리고 싶을 때:

```bash
ssh gcp-vm
cd ~/slgi
git fetch && git reset --hard origin/main
bash deploy/deploy.sh
```

## 파일 구조

| 파일 | 역할 |
|------|------|
| `.github/workflows/deploy.yml` | GH Actions — push 감지 → SSH → deploy.sh 호출 |
| `deploy/setup-vm.sh` | 1회성 부트스트랩 (apt/uv/nvm/docker/nginx/systemd) |
| `deploy/deploy.sh` | 배포 본체 — 매 push마다 VM에서 실행 |
| `deploy/gunicorn.service` | systemd 유닛 (gunicorn) |
| `deploy/nginx.conf` | nginx 사이트 설정 |

## 트러블슈팅

- **502 Bad Gateway** → `sudo journalctl -u gunicorn -n 100` 으로 .env 누락이나 마이그레이션 에러 확인
- **CORS 에러** → 동일 오리진이라 안 나야 정상. 나면 `DJANGO_CORS_ALLOWED_ORIGINS` 확인
- **GitHub Action SSH 실패** → `SSH_PRIVATE_KEY` 시크릿이 줄바꿈 포함 전체인지 확인
- **nginx 403** → `chmod o+x ~ ~/slgi` 가 적용됐는지 (setup-vm.sh가 자동 처리)
- **GDAL 에러** → backend/.env 의 `GDAL_LIBRARY_PATH`/`GEOS_LIBRARY_PATH` 라인은 Linux에서 비워두거나 제거
