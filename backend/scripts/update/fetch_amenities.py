"""편의시설(소상공인 상가 + 서울시 도시공원) 적재 스크립트.

데이터 출처
-----------
- data.go.kr 15012005 (소상공인시장진흥공단 상가(상권)정보)
  → 편의점/마트/카페/병원/약국/세탁소/올리브영/음식점 등.
  → 시군구 단위 일괄 호출 (`divId=signguCd, key=11140`) → 자치구 1회 호출당 ~24k건.
  → 응답에 `lon/lat` (WGS84) 가 들어와 별도 지오코딩 불필요.
  → 행정동 매핑은 응답의 lon/lat → `Dong.geom__contains` spatial join 사용 (Dong.code 와
    SBA `adongCd` 가 다른 체계라 코드 직접 매핑 불가).
- data.seoul.go.kr SearchParkInfoService (서울시 도시공원 정보, 약 133개)
  → 공원. `XCRD/YCRD` 가 WGS84 lon/lat.

CATEGORY 매핑 (SPEC 6.3, 모델 CATEGORY_CHOICES 기준)
----------------------------------------------------
편의점        : indsSclsCd == 'G20405'
마트          : indsSclsCd in ('G20404', 'G20509')          # 슈퍼마켓 + 반찬/식료품 소매
음식점        : indsMclsCd in ('I201','I202','I203','I204','I210') # 한/중/일/양/분식
카페          : indsSclsCd == 'I21201'
스터디카페    : bizesNm 에 '스터디' 포함 (공식 코드 없음)
병원          : indsMclsCd in ('Q101','Q102')               # 병원 + 의원
약국          : indsSclsCd == 'G21501'
세탁소        : indsMclsCd == 'S203'
올리브영      : bizesNm 에 '올리브영' 포함

Usage
-----
    export DATA_GO_KR_API_KEY=...
    export SEOUL_OPEN_API_KEY=...

    python scripts/fetch_amenities.py --target stores --gu 중구 --dry-run
    python scripts/fetch_amenities.py --target stores --gu 중구
    python scripts/fetch_amenities.py --target parks
    python scripts/fetch_amenities.py --target all          # 25개 구 + 공원 풀 적재
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Iterable

from _django import require_env, setup

setup()

import requests  # noqa: E402

from django.contrib.gis.geos import Point  # noqa: E402
from django.db import transaction  # noqa: E402


# ---------------------------------------------------------------------------
# 자치구 → SBA(행안부) 시군구코드 매핑.
# Dong.gu (한국어) 만으로 호출할 수 있도록 사전.
# ---------------------------------------------------------------------------
GU_TO_SIGUNGU_CD: dict[str, str] = {
    "종로구": "11110",
    "중구": "11140",
    "용산구": "11170",
    "성동구": "11200",
    "광진구": "11215",
    "동대문구": "11230",
    "중랑구": "11260",
    "성북구": "11290",
    "강북구": "11305",
    "도봉구": "11320",
    "노원구": "11350",
    "은평구": "11380",
    "서대문구": "11410",
    "마포구": "11440",
    "양천구": "11470",
    "강서구": "11500",
    "구로구": "11530",
    "금천구": "11545",
    "영등포구": "11560",
    "동작구": "11590",
    "관악구": "11620",
    "서초구": "11650",
    "강남구": "11680",
    "송파구": "11710",
    "강동구": "11740",
}


SBA_ENDPOINT = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong"
SEOUL_PARK_ENDPOINT_TPL = (
    "http://openapi.seoul.go.kr:8088/{key}/json/SearchParkInfoService/{start}/{end}/"
)

PAGE_SIZE = 1000  # SBA numOfRows 상한
MAX_PAGES = 60    # 자치구 1개당 안전 상한 (24k/1k = 24)


# ---------------------------------------------------------------------------
# HTTP 헬퍼 (재시도 / 백오프)
# ---------------------------------------------------------------------------
def _get_with_retry(url: str, params: dict, *, retries: int = 3, timeout: int = 30) -> requests.Response:
    """429 / 5xx 시 exponential backoff 재시도."""

    delay = 1.0
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(delay)
                delay *= 2
                continue
            return resp
        except requests.RequestException as exc:
            last_exc = exc
            time.sleep(delay)
            delay *= 2
    if last_exc:
        raise last_exc
    return resp  # type: ignore[name-defined]


# ---------------------------------------------------------------------------
# 카테고리 분류
# ---------------------------------------------------------------------------
RESTAURANT_MCAT = {"I201", "I202", "I203", "I204", "I210"}
HOSPITAL_MCAT = {"Q101", "Q102"}
MART_SCAT = {"G20404", "G20509"}


def classify(item: dict) -> str | None:
    """SBA item dict → CATEGORY_CHOICES value 또는 None(스킵)."""

    scls = item.get("indsSclsCd") or ""
    mcls = item.get("indsMclsCd") or ""
    name = item.get("bizesNm") or ""

    # 1) 키워드 우선 (분류 표가 명확하지 않은 케이스)
    if "올리브영" in name:
        return "oliveyoung"
    if "스터디카페" in name or "스터디 카페" in name:
        return "studycafe"

    # 2) 코드 매핑
    if scls == "G20405":
        return "convenience"
    if scls in MART_SCAT:
        return "mart"
    if scls == "I21201":
        return "cafe"
    if scls == "G21501":
        return "pharmacy"
    if mcls in RESTAURANT_MCAT:
        return "restaurant"
    if mcls in HOSPITAL_MCAT:
        return "hospital"
    if mcls == "S203":
        return "laundry"

    return None  # 그 외는 적재하지 않음 (SPEC 6.3 카테고리 외 = 노이즈)


# ---------------------------------------------------------------------------
# SBA: 자치구 단위 페이지네이션 호출
# ---------------------------------------------------------------------------
def fetch_gu_stores(api_key: str, sigungu_cd: str, *, dry_run: bool = False) -> Iterable[dict]:
    """자치구 1개의 모든 상가 row 를 yield 한다."""

    for page_no in range(1, MAX_PAGES + 1):
        params = {
            "serviceKey": api_key,
            "divId": "signguCd",
            "key": sigungu_cd,
            "pageNo": page_no,
            "numOfRows": PAGE_SIZE,
            "type": "json",
        }
        resp = _get_with_retry(SBA_ENDPOINT, params)
        if resp.status_code != 200:
            print(f"  [WARN] sigungu={sigungu_cd} page={page_no} HTTP {resp.status_code}")
            return
        try:
            j = resp.json()
        except ValueError:
            print(f"  [WARN] sigungu={sigungu_cd} page={page_no} non-JSON response head={resp.text[:120]}")
            return

        header = j.get("header") or {}
        if header.get("resultCode") and header["resultCode"] != "00":
            # 일부 정상 응답은 resultCode 가 빠지고 description 만 있는 형태라 빈 코드는 OK
            print(
                f"  [WARN] sigungu={sigungu_cd} page={page_no} "
                f"code={header.get('resultCode')} msg={header.get('resultMsg')}"
            )
            return

        body = j.get("body") or {}
        items = body.get("items") or []
        total = body.get("totalCount")

        if page_no == 1:
            print(f"  sigungu={sigungu_cd} totalCount={total}")
            if dry_run and total is not None:
                # dry-run 은 첫 페이지만 인덱싱 후 종료 (호출 비용 절약)
                yield from items
                return

        if not items:
            return

        yield from items

        if len(items) < PAGE_SIZE:
            return


# ---------------------------------------------------------------------------
# 행정동 spatial join
# ---------------------------------------------------------------------------
def _dong_lookup(lng: float, lat: float, gu: str | None = None):
    """좌표 → Dong instance 또는 None.

    `gu` 힌트가 있으면 해당 구만 우선 검색해 비용 절감 (모든 dong 25배 빠름).
    """

    from apps.service.neighborhoods.models import Dong  # noqa: WPS433

    point = Point(lng, lat, srid=4326)
    qs = Dong.objects.filter(geom__contains=point)
    if gu:
        scoped = qs.filter(gu=gu).first()
        if scoped:
            return scoped, point
    return qs.first(), point


# ---------------------------------------------------------------------------
# 적재 — SBA stores
# ---------------------------------------------------------------------------
def _persist_stores(items: Iterable[dict], gu: str | None) -> dict[str, int]:
    """items → Amenity rows. 카운트 dict 반환 (categories + skipped 사유)."""

    from apps.service.amenities.models import Amenity  # noqa: WPS433

    stats = {
        "seen": 0,
        "no_coord": 0,
        "no_category": 0,
        "no_dong": 0,
        "out_of_seoul_gu": 0,
        "upserted": 0,
    }
    cat_counts: dict[str, int] = {}

    for it in items:
        stats["seen"] += 1
        category = classify(it)
        if not category:
            stats["no_category"] += 1
            continue

        try:
            lng = float(it.get("lon"))
            lat = float(it.get("lat"))
        except (TypeError, ValueError):
            stats["no_coord"] += 1
            continue

        dong, point = _dong_lookup(lng, lat, gu=gu)
        if dong is None:
            stats["no_dong"] += 1
            continue

        bizes_id = it.get("bizesId")
        if not bizes_id:
            stats["no_category"] += 1
            continue

        Amenity.objects.update_or_create(
            external_id=bizes_id,
            defaults={
                "dong": dong,
                "category": category,
                "name": (it.get("bizesNm") or "")[:200],
                "geom": point,
                "source": "sba",
            },
        )
        stats["upserted"] += 1
        cat_counts[category] = cat_counts.get(category, 0) + 1

    stats["categories"] = cat_counts  # type: ignore[assignment]
    return stats


# ---------------------------------------------------------------------------
# 공원
# ---------------------------------------------------------------------------
def fetch_parks(api_key: str, *, dry_run: bool = False) -> list[dict]:
    """서울시 도시공원 전체 row 리스트 반환 (페이지네이션)."""

    all_rows: list[dict] = []
    chunk = 1000  # API 한 번 호출당 최대
    start = 1
    while True:
        end = start + chunk - 1
        url = SEOUL_PARK_ENDPOINT_TPL.format(key=api_key, start=start, end=end)
        resp = _get_with_retry(url, params={})
        if resp.status_code != 200:
            print(f"  [WARN] parks start={start} HTTP {resp.status_code}")
            break
        j = resp.json()
        block = j.get("SearchParkInfoService") or {}
        result = block.get("RESULT") or {}
        if result.get("CODE") not in (None, "INFO-000"):
            print(f"  [WARN] parks {result.get('CODE')} {result.get('MESSAGE')}")
            break
        rows = block.get("row") or []
        total = block.get("list_total_count") or 0
        all_rows.extend(rows)
        if start == 1:
            print(f"  parks list_total_count={total}")
            if dry_run:
                break
        start += chunk
        if start > total:
            break
    return all_rows


def _persist_parks(rows: Iterable[dict]) -> dict[str, int]:
    from apps.service.amenities.models import Amenity  # noqa: WPS433

    stats = {"seen": 0, "no_coord": 0, "no_dong": 0, "upserted": 0}
    for r in rows:
        stats["seen"] += 1
        try:
            lng = float(r.get("XCRD"))
            lat = float(r.get("YCRD"))
        except (TypeError, ValueError):
            stats["no_coord"] += 1
            continue

        # 서울 외(과천 등) 좌표는 ContainsRoom Dong 이 없어 자연스럽게 no_dong 으로 빠짐
        dong, point = _dong_lookup(lng, lat, gu=r.get("RGN") or None)
        if dong is None:
            stats["no_dong"] += 1
            continue

        # 공원은 자체 ID 가 SN(시퀀스 번호) 인데 안정적이지 않을 수 있음 → 'park:<sn>' prefix
        sn = r.get("SN")
        external_id = f"park:{sn}" if sn else None

        defaults = {
            "dong": dong,
            "category": "park",
            "name": (r.get("PARK_NM") or "")[:200],
            "geom": point,
            "source": "seoul_park",
        }
        if external_id:
            Amenity.objects.update_or_create(external_id=external_id, defaults=defaults)
        else:
            # external_id 없으면 (dong, name) 기준 upsert (공원은 동당 동명이공원 거의 없음)
            Amenity.objects.update_or_create(
                dong=dong, category="park", name=defaults["name"],
                defaults={k: v for k, v in defaults.items() if k != "name"},
            )
        stats["upserted"] += 1
    return stats


# ---------------------------------------------------------------------------
# 메인 흐름
# ---------------------------------------------------------------------------
def _run_stores(args, api_key: str) -> int:
    from apps.service.neighborhoods.models import Dong  # noqa: WPS433

    if not Dong.objects.exists():
        print("[WARN] Dong 테이블이 비어 있습니다. 먼저 load_dongs 적재 필요.")
        return 1

    if args.gu:
        gus = [args.gu]
    else:
        gus = sorted({d.gu for d in Dong.objects.all()})

    if args.limit:
        gus = gus[: args.limit]

    grand_total = {"seen": 0, "no_coord": 0, "no_category": 0, "no_dong": 0, "upserted": 0}
    grand_cats: dict[str, int] = {}

    for gu in gus:
        sigungu_cd = GU_TO_SIGUNGU_CD.get(gu)
        if not sigungu_cd:
            print(f"[WARN] gu='{gu}' SBA 시군구 코드 매핑 미존재. 스킵.")
            continue

        print(f"\n=== {gu} (sigunguCd={sigungu_cd}) ===")
        items_iter = fetch_gu_stores(api_key, sigungu_cd, dry_run=args.dry_run)

        if args.dry_run:
            sample = list(items_iter)[:50]
            cats = {}
            for it in sample:
                c = classify(it)
                if c:
                    cats[c] = cats.get(c, 0) + 1
            print(f"  [DRY] sampled {len(sample)} items, classified={cats}")
            continue

        with transaction.atomic():
            stats = _persist_stores(items_iter, gu=gu)
        for k in grand_total:
            grand_total[k] += stats.get(k, 0)
        for k, v in stats.get("categories", {}).items():
            grand_cats[k] = grand_cats.get(k, 0) + v
        print(f"  stats: {stats}")

    print(f"\n=== STORES TOTAL ===")
    print(f"  {grand_total}")
    print(f"  by category: {grand_cats}")
    return 0


def _run_parks(args, api_key: str) -> int:
    from apps.service.neighborhoods.models import Dong  # noqa: WPS433

    if not Dong.objects.exists():
        print("[WARN] Dong 테이블이 비어 있습니다. 먼저 load_dongs 적재 필요.")
        return 1

    print("\n=== PARKS ===")
    rows = fetch_parks(api_key, dry_run=args.dry_run)
    print(f"  fetched={len(rows)}")
    if args.dry_run:
        for r in rows[:5]:
            print(f"  [DRY] {r.get('PARK_NM')} XCRD={r.get('XCRD')} YCRD={r.get('YCRD')} RGN={r.get('RGN')}")
        return 0

    with transaction.atomic():
        stats = _persist_parks(rows)
    print(f"  stats: {stats}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="편의시설 적재 (소상공인 상가 + 공원)")
    parser.add_argument(
        "--target",
        choices=["stores", "parks", "all"],
        default="stores",
        help="stores=소상공인, parks=공원, all=둘 다",
    )
    parser.add_argument("--gu", default=None, help="(stores) 특정 구만 처리. 예: '중구'")
    parser.add_argument("--limit", type=int, default=None, help="(stores) 처리할 구 수 제한")
    parser.add_argument("--dry-run", action="store_true", help="응답 샘플만 인쇄, DB 쓰기 없음")
    args = parser.parse_args()

    if args.target in ("stores", "all"):
        sba_key = require_env(
            "DATA_GO_KR_API_KEY",
            hint="data.go.kr 일반 인증키. '소상공인 상가(상권)정보' 활용 신청 필요 (15012005)",
        )
        rc = _run_stores(args, sba_key)
        if rc != 0:
            return rc

    if args.target in ("parks", "all"):
        seoul_key = require_env(
            "SEOUL_OPEN_API_KEY",
            hint="data.seoul.go.kr 일반 인증키. '서울시 도시공원 정보' 사용.",
        )
        rc = _run_parks(args, seoul_key)
        if rc != 0:
            return rc

    print("\nDONE.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
