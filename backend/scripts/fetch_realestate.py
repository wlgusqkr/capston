"""국토교통부 실거래가(전월세) API 적재 스크립트.

데이터 출처
-----------
- data.go.kr 15126473 (연립다세대 전월세) — `RTMSDataSvcRHRent`
- data.go.kr 15126472 (단독다가구 전월세) — `RTMSDataSvcSHRent`
- data.go.kr 15126475 (오피스텔 전월세) — `RTMSDataSvcOffiRent`

이 스크립트의 출력은 SPEC 6.3 (동네 상세 시세 차트) 의 입력 데이터다.

처리 절차 (SPEC 14.2)
---------------------
1. 자치구(LAWD_CD) 별로 월 단위 호출.
2. 응답 XML 파싱 → 법정동명(umdNm) / 면적(excluUseAr or totalFloorAr) /
   보증금(deposit) / 월세(monthlyRent) / 계약일 추출.
3. **지오코딩**: 지번 단위만 (`{gu} {umdNm} {jibun}`) — VWorld backend key.
   - JibunGeocodeCache 먼저 lookup, miss 시 호출 후 캐시 저장.
   - 매물(건물) 단위 정밀 좌표 금지 (SPEC 14.2).
4. 행정동(Dong) 매핑: PostGIS spatial join (`Dong.geom__contains=point`).
   - 좌표가 없으면 (geocode 실패 OR 단독/다가구처럼 jibun 없음) → umdNm 으로
     같은 구 내 같은 이름 Dong fallback. 매칭 실패 시 skip.
5. 사전 컷: deposit==0 AND monthly_rent==0 → skip; monthly_rent > 5000 → skip.
6. IQR 1.5배 클리핑: area_m2 / deposit / monthly_rent.
7. apps.realestate.RentDeal `update_or_create(external_hash=...)` (idempotent).

Usage
-----
    export DATA_GO_KR_API_KEY=...   # data.go.kr 일반 인증키 (Decoding)
    export VWORLD_API_KEY=...        # vworld 백엔드 키 (도메인 제한 X)

    # 5개 데모 구 6개월
    python scripts/fetch_realestate.py --months 6

    # 단일 구, 1개월, dry-run (호출/카운트만)
    python scripts/fetch_realestate.py --gu 중구 --months 1 --dry-run

    # 지오코딩 스킵 적재 (geom=null) — 사전 검증용
    python scripts/fetch_realestate.py --gu 중구 --months 1 --no-geocode
"""

from __future__ import annotations

import argparse
import hashlib
import sys
import time
import xml.etree.ElementTree as ET
from datetime import date
from typing import Iterable

import requests

# ---- Django setup -----------------------------------------------------
from _django import require_env, setup

setup()


# ---- 상수 -------------------------------------------------------------
# Phase 0a 데모 범위: 5개 구 (kickoff 문서 결정).
# 25개 구 LAWD_CD (5자리) — 행정안전부 표준 자치구 코드.
SEOUL_LAWD_CODES = {
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

# 데모용 5개 구 (kickoff 결정)
DEMO_GU = ["중구", "종로구", "관악구", "마포구", "동대문구"]

# data.go.kr 엔드포인트 (HTTPS) + deal_type 매핑.
# `villa` (연립다세대) / `danok` (단독다가구) / `officetel` (오피스텔).
ENDPOINTS = {
    "villa": "https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
    "danok": "https://apis.data.go.kr/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent",
    "officetel": "https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
}

VWORLD_GEOCODE_URL = "https://api.vworld.kr/req/address"

# 사전 컷 임계
MAX_MONTHLY_RENT = 5000  # 만원. 5000만원 초과 월세는 노이즈로 본다.

# HTTP retry / sleep
HTTP_RETRY = 3
HTTP_SLEEP_BETWEEN_VWORLD = 0.06  # ~16 req/s, 안전 마진


# ---- 유틸 -------------------------------------------------------------
def _to_int(s: str | None) -> int | None:
    """'15,000' → 15000. 빈/공백 → None."""
    if s is None:
        return None
    t = s.strip().replace(",", "")
    if not t:
        return None
    try:
        return int(t)
    except ValueError:
        return None


def _to_float(s: str | None) -> float | None:
    if s is None:
        return None
    t = s.strip().replace(",", "")
    if not t:
        return None
    try:
        return float(t)
    except ValueError:
        return None


def _text(elem: ET.Element, tag: str) -> str | None:
    sub = elem.find(tag)
    if sub is None:
        return None
    return (sub.text or "").strip() or None


def normalize_jibun_text(gu: str, umd_nm: str, jibun: str) -> str:
    """캐시 키로 쓸 정규화된 지번 문자열.

    예: '중구', '신당동', '432-1935' → '서울특별시 중구 신당동 432-1935'
    공백 normalize, 산/번지 prefix 정리.
    """
    parts = ["서울특별시", gu.strip(), umd_nm.strip(), jibun.strip()]
    normalized = " ".join(p for p in parts if p)
    # 중복 공백 제거
    return " ".join(normalized.split())


# ---- 응답 파서 --------------------------------------------------------
def parse_xml(xml_text: str, deal_type: str, gu: str) -> list[dict]:
    """국토부 전월세 XML 응답 → dict 리스트.

    공통 필드 (3개 deal_type):
      buildYear, dealYear, dealMonth, dealDay, deposit (만원, 콤마),
      monthlyRent (만원), umdNm (법정동명), sggCd (자치구코드).

    villa / officetel:
      excluUseAr (전용면적 m^2), floor, jibun, mhouseNm/offiNm.
    danok:
      totalFloorAr (총면적), houseType (단독/다가구). jibun, floor 없음.
    """
    root = ET.fromstring(xml_text)
    header_code = root.findtext("./header/resultCode") or ""
    if header_code not in ("00", "000"):
        msg = root.findtext("./header/resultMsg") or "?"
        raise RuntimeError(f"API error: code={header_code} msg={msg}")

    out: list[dict] = []
    for item in root.findall("./body/items/item"):
        y = _to_int(_text(item, "dealYear"))
        m = _to_int(_text(item, "dealMonth"))
        d = _to_int(_text(item, "dealDay"))
        if not (y and m and d):
            continue
        try:
            deal_date = date(y, m, d)
        except ValueError:
            continue

        deposit = _to_int(_text(item, "deposit")) or 0
        monthly_rent = _to_int(_text(item, "monthlyRent")) or 0

        if deal_type == "danok":
            area = _to_float(_text(item, "totalFloorAr"))
            jibun = ""  # 단독/다가구는 응답에 jibun 자체가 없음
            floor = None
        else:
            area = _to_float(_text(item, "excluUseAr"))
            jibun = _text(item, "jibun") or ""
            floor = _to_int(_text(item, "floor"))

        umd_nm = _text(item, "umdNm") or ""
        build_year = _to_int(_text(item, "buildYear"))

        if not (area and area > 0):
            continue

        out.append(
            {
                "deal_type": deal_type,
                "deal_date": deal_date,
                "area_m2": area,
                "deposit": deposit,
                "monthly_rent": monthly_rent,
                "floor": floor,
                "build_year": build_year,
                "jibun": jibun,
                "umd_nm": umd_nm,
                "gu": gu,
            }
        )
    return out


# ---- HTTP fetch -------------------------------------------------------
def http_get_with_retry(url: str, params: dict, *, timeout: int = 15) -> requests.Response:
    """Exponential backoff retry. 최대 HTTP_RETRY 회."""
    last_exc: Exception | None = None
    for attempt in range(HTTP_RETRY):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            if r.status_code == 200:
                return r
            last_exc = RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")
        except requests.RequestException as e:
            last_exc = e
        # backoff 0.5, 1.0, 2.0
        time.sleep(0.5 * (2**attempt))
    assert last_exc is not None
    raise last_exc


def fetch_one_month(
    api_key: str, lawd_cd: str, deal_ym: str, deal_type: str, gu: str
) -> tuple[list[dict], int]:
    """한 자치구 × 한 달 분 호출 (페이지네이션 포함). (rows, http_calls)."""
    url = ENDPOINTS[deal_type]
    page_no = 1
    num_of_rows = 1000
    collected: list[dict] = []
    http_calls = 0

    while True:
        params = {
            "serviceKey": api_key,
            "LAWD_CD": lawd_cd,
            "DEAL_YMD": deal_ym,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        }
        r = http_get_with_retry(url, params)
        http_calls += 1
        rows = parse_xml(r.text, deal_type=deal_type, gu=gu)
        collected.extend(rows)

        # totalCount 검사로 페이지네이션 종료 결정
        try:
            root = ET.fromstring(r.text)
            total_count = int(root.findtext("./body/totalCount") or "0")
        except Exception:
            total_count = len(rows)
        if page_no * num_of_rows >= total_count:
            break
        page_no += 1
        if page_no > 50:  # 안전 가드 (월 5만 건 = 비현실)
            break

    return collected, http_calls


# ---- 이상치 처리 (SPEC 14.2) ------------------------------------------
def clip_outliers(rows: list[dict], columns: Iterable[str]) -> list[dict]:
    """IQR 1.5배 외 값 제거. 학부 수준이라 pandas 안 쓰고 numpy 단독."""
    import numpy as np

    if not rows:
        return rows

    keep = [True] * len(rows)
    for col in columns:
        values = np.array([r[col] for r in rows if r.get(col) is not None], dtype=float)
        if values.size < 4:
            continue
        # 보증금/월세 0(전세) 등 합리적 0 값은 분포에 포함하되 양 끝만 잘라낸다.
        q1, q3 = np.percentile(values, [25, 75])
        iqr = q3 - q1
        if iqr == 0:
            continue
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        for i, r in enumerate(rows):
            v = r.get(col)
            if v is None:
                continue
            if v < lo or v > hi:
                keep[i] = False
    return [r for r, k in zip(rows, keep) if k]


def precut(rows: list[dict]) -> list[dict]:
    """명백한 노이즈 컷: 보증금+월세 모두 0 / 월세 5000만원+."""
    out = []
    for r in rows:
        if r["deposit"] == 0 and r["monthly_rent"] == 0:
            continue
        if r["monthly_rent"] > MAX_MONTHLY_RENT:
            continue
        out.append(r)
    return out


# ---- 지오코딩 (VWorld) ------------------------------------------------
class GeocodeStats:
    __slots__ = ("cache_hits", "vworld_calls", "vworld_success", "vworld_fail")

    def __init__(self) -> None:
        self.cache_hits = 0
        self.vworld_calls = 0
        self.vworld_success = 0
        self.vworld_fail = 0


def geocode_jibun(
    vworld_key: str, gu: str, umd_nm: str, jibun: str, stats: GeocodeStats
):
    """지번 → (lng, lat) 또는 None. 캐시 우선. 실패 시 None."""
    from django.contrib.gis.geos import Point

    from apps.realestate.models import JibunGeocodeCache

    key = normalize_jibun_text(gu, umd_nm, jibun)
    if not jibun.strip():
        return None, key

    cached = JibunGeocodeCache.objects.filter(jibun_text=key).first()
    if cached is not None:
        stats.cache_hits += 1
        return cached.geom, key

    params = {
        "service": "address",
        "request": "getCoord",
        "version": "2.0",
        "crs": "EPSG:4326",
        "address": key,
        "format": "json",
        "type": "PARCEL",
        "key": vworld_key,
    }
    stats.vworld_calls += 1
    try:
        r = http_get_with_retry(VWORLD_GEOCODE_URL, params, timeout=10)
    except Exception:
        stats.vworld_fail += 1
        return None, key
    finally:
        time.sleep(HTTP_SLEEP_BETWEEN_VWORLD)

    try:
        data = r.json()
    except Exception:
        stats.vworld_fail += 1
        return None, key

    status = (data.get("response") or {}).get("status")
    if status != "OK":
        stats.vworld_fail += 1
        return None, key
    pt = (((data.get("response") or {}).get("result") or {}).get("point") or {})
    try:
        lng = float(pt["x"])
        lat = float(pt["y"])
    except (KeyError, ValueError, TypeError):
        stats.vworld_fail += 1
        return None, key

    point = Point(lng, lat, srid=4326)
    # 캐시 저장 (멱등)
    JibunGeocodeCache.objects.update_or_create(
        jibun_text=key, defaults={"geom": point}
    )
    stats.vworld_success += 1
    return point, key


# ---- 행정동 매핑 ------------------------------------------------------
def resolve_dong(point, gu: str, umd_nm: str):
    """좌표 → spatial join. 실패 시 같은 구 + 같은 이름 Dong fallback.

    반환: Dong 인스턴스 또는 None.
    """
    from apps.neighborhoods.models import Dong

    if point is not None:
        d = Dong.objects.filter(geom__contains=point).first()
        if d is not None:
            return d
    # fallback: umdNm 이 행정동명과 일치하는 케이스 (예: 신당동, 명동)
    if umd_nm:
        d = Dong.objects.filter(gu=gu, name=umd_nm).first()
        if d is not None:
            return d
        # umdNm 이 '신당동' 같은 단순 케이스 외에 '필동2가' 같이 가(街) 붙은 법정동도
        # 흔하다. 행정동은 보통 가(街) 떼고 묶이므로 prefix 매칭 시도.
        # ex) umdNm='필동2가' → 행정동 '필동' 매칭.
        base = umd_nm.split("가")[0] + "동" if "가" in umd_nm else None
        if base:
            d = Dong.objects.filter(gu=gu, name=base).first()
            if d is not None:
                return d
    return None


# ---- 적재 -------------------------------------------------------------
def make_external_hash(r: dict) -> str:
    raw = "|".join(
        [
            r["deal_type"],
            r["deal_date"].isoformat(),
            r.get("jibun") or r.get("umd_nm") or "",
            str(r["deposit"]),
            str(r["monthly_rent"]),
            f"{r['area_m2']:.2f}",
            str(r.get("floor") or ""),
            r.get("gu") or "",
        ]
    )
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def persist(
    rows: list[dict],
    *,
    vworld_key: str | None,
    no_geocode: bool,
    stats: GeocodeStats,
) -> tuple[int, int, int]:
    """rows → DB. 반환: (inserted, updated, skipped)."""
    from apps.realestate.models import RentDeal

    inserted = updated = skipped = 0
    for r in rows:
        point = None
        if not no_geocode and vworld_key and r.get("jibun"):
            point, _ = geocode_jibun(
                vworld_key, r["gu"], r["umd_nm"], r["jibun"], stats
            )

        dong = resolve_dong(point, r["gu"], r["umd_nm"])
        if dong is None:
            skipped += 1
            continue

        ext_hash = make_external_hash(r)
        defaults = {
            "dong": dong,
            "deal_type": r["deal_type"],
            "deal_date": r["deal_date"],
            "area_m2": r["area_m2"],
            "deposit": r["deposit"],
            "monthly_rent": r["monthly_rent"],
            "floor": r.get("floor"),
            "build_year": r.get("build_year"),
            "jibun": (r.get("jibun") or "")[:64],
            "geom": point,
        }
        _, created = RentDeal.objects.update_or_create(
            external_hash=ext_hash, defaults=defaults
        )
        if created:
            inserted += 1
        else:
            updated += 1

    return inserted, updated, skipped


# ---- 메인 -------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="국토부 실거래가(전월세) 적재")
    parser.add_argument(
        "--months",
        type=int,
        default=6,
        help="현재 월 직전부터 과거 몇 개월 (기본 6)",
    )
    parser.add_argument(
        "--gu",
        default=None,
        help=f"특정 구만 (기본: 데모 5개 구 {DEMO_GU})",
    )
    parser.add_argument(
        "--deal-type",
        choices=list(ENDPOINTS.keys()) + ["all"],
        default="all",
        help="거래 유형 (villa/danok/officetel/all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="API 호출 없이 의도만 출력 (모든 콜 시뮬레이션, DB 미접근)",
    )
    parser.add_argument(
        "--no-geocode",
        action="store_true",
        help="VWorld 호출 스킵 (geom=null로 적재). 사전 검증/속도 테스트용.",
    )
    args = parser.parse_args()

    api_key = require_env(
        "DATA_GO_KR_API_KEY",
        hint="data.go.kr 일반 인증키(Decoding). 활용신청: 15126473/72/75",
    )
    vworld_key: str | None
    if args.no_geocode:
        vworld_key = None
    else:
        vworld_key = require_env(
            "VWORLD_API_KEY",
            hint="vworld 백엔드 키 (도메인 제한 X). 지오코딩(getCoord, type=PARCEL).",
        )

    # 대상 구
    if args.gu:
        if args.gu not in SEOUL_LAWD_CODES:
            print(f"[ERROR] 알 수 없는 구: {args.gu}", file=sys.stderr)
            return 1
        target_gus = [args.gu]
    else:
        target_gus = DEMO_GU

    # 대상 월: 현재 월 직전 N개월 (현재 월은 데이터 미공개 가능성 높아 제외)
    today = date.today()
    months: list[str] = []
    y, m = today.year, today.month
    # 직전 달부터 시작
    m -= 1
    if m == 0:
        m = 12
        y -= 1
    for _ in range(args.months):
        months.append(f"{y:04d}{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1

    deal_types = list(ENDPOINTS.keys()) if args.deal_type == "all" else [args.deal_type]

    print(f"target gus     : {target_gus}")
    print(f"target months  : {months}")
    print(f"target types   : {deal_types}")
    print(f"dry_run={args.dry_run} no_geocode={args.no_geocode}")
    print()

    # ---- 실행 -----
    stats = GeocodeStats()
    total_rows_seen = 0
    total_rows_after_cut = 0
    total_rows_after_clip = 0
    total_inserted = total_updated = total_skipped = 0
    total_http_calls = 0
    by_type: dict[str, dict[str, int]] = {dt: {"raw": 0, "kept": 0, "ins": 0, "upd": 0} for dt in deal_types}

    for gu in target_gus:
        lawd_cd = SEOUL_LAWD_CODES[gu]
        for deal_type in deal_types:
            for ym in months:
                if args.dry_run:
                    print(
                        f"[DRY] {gu:>4} ({lawd_cd}) {deal_type:>9} {ym} -> "
                        f"would call {ENDPOINTS[deal_type].split('/')[-1]}"
                    )
                    total_http_calls += 1
                    continue

                try:
                    rows, http_calls = fetch_one_month(api_key, lawd_cd, ym, deal_type, gu)
                except Exception as e:
                    print(f"[ERROR] {gu} {deal_type} {ym}: {e}", file=sys.stderr)
                    continue

                total_http_calls += http_calls
                by_type[deal_type]["raw"] += len(rows)
                total_rows_seen += len(rows)

                rows = precut(rows)
                total_rows_after_cut += len(rows)
                rows = clip_outliers(rows, columns=("area_m2", "deposit", "monthly_rent"))
                by_type[deal_type]["kept"] += len(rows)
                total_rows_after_clip += len(rows)

                ins, upd, skp = persist(
                    rows,
                    vworld_key=vworld_key,
                    no_geocode=args.no_geocode,
                    stats=stats,
                )
                by_type[deal_type]["ins"] += ins
                by_type[deal_type]["upd"] += upd
                total_inserted += ins
                total_updated += upd
                total_skipped += skp

                print(
                    f"  {gu:>4} {deal_type:>9} {ym}  raw={len(rows):4d}  "
                    f"+{ins:4d} ins / {upd:4d} upd / {skp:3d} skip "
                    f"(http calls so far={total_http_calls})"
                )

    print("\n=== SUMMARY ===")
    print(f"http calls (data.go.kr) : {total_http_calls}")
    if args.dry_run:
        return 0
    print(f"rows raw                : {total_rows_seen}")
    print(f"rows after precut       : {total_rows_after_cut}")
    print(f"rows after IQR clip     : {total_rows_after_clip}")
    if total_rows_seen:
        print(
            f"  clip retention        : "
            f"{total_rows_after_clip / total_rows_seen:.1%}"
        )
    print(f"inserted                : {total_inserted}")
    print(f"updated                 : {total_updated}")
    print(f"skipped (no dong match) : {total_skipped}")
    print()
    print("by deal_type:")
    for dt, d in by_type.items():
        print(
            f"  {dt:>9}: raw={d['raw']:5d}  kept={d['kept']:5d}  "
            f"ins={d['ins']:5d}  upd={d['upd']:5d}"
        )
    print()
    print("geocode:")
    total_lookups = stats.cache_hits + stats.vworld_calls
    print(f"  cache_hits     : {stats.cache_hits}")
    print(f"  vworld_calls   : {stats.vworld_calls}")
    print(f"  vworld_success : {stats.vworld_success}")
    print(f"  vworld_fail    : {stats.vworld_fail}")
    if total_lookups:
        print(
            f"  cache_hit_rate : {stats.cache_hits / total_lookups:.1%}"
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
