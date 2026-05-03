"""국토교통부 실거래가(전월세) API 적재 스크립트 — 골격.

데이터 출처
-----------
- data.go.kr 15126473 (연립다세대 전월세)
- data.go.kr 15126472 (단독다가구 전월세)
- data.go.kr 15126475 (오피스텔 전월세)

이 스크립트의 출력은 SPEC 6.3 (동네 상세 시세 차트)의 입력 데이터다.

처리 절차 (SPEC 14.2)
---------------------
1. 자치구(LAWD_CD) 별로 월 단위 호출 (서울 25개 구).
2. 응답 XML 파싱 → 법정동 / 면적 / 보증금 / 월세 추출.
3. 법정동 → 행정동 매핑 적용 (build_dong_mapping.py 결과 사용).
4. IQR 클리핑: 보증금/월세 컬럼 별로 outlier 제거 (보증금 0, 월세 5000만원+ 등 명백한
   이상치는 사전 필터링).
5. 거래량 3건 미만 동/월은 점 생략 (SPEC 14.2).
6. apps.realestate.RentDeal 테이블에 update_or_create.

CURRENT STATUS
--------------
**모델 미존재.** apps/realestate/ 앱이 아직 만들어지지 않아 DB 적재가 막혀 있다.
이 스크립트는 키 검증 + dry-run 인쇄까지만 수행하고 종료한다. 실 데이터 적재 단계에서:

    1) `apps/realestate/models.py` 에 RentDeal 모델 추가 (SPEC 10).
    2) settings.INSTALLED_APPS 등록 + makemigrations + migrate.
    3) 본 스크립트 하단 _persist_dryrun → _persist_db 로 교체.

Usage
-----
    export DATA_GO_KR_API_KEY=...            # data.go.kr 일반인증키 (Decoding) — 같은 키로 fetch_amenities.py 도 동작
    python scripts/fetch_realestate.py --months 12 --deal-type villa
    python scripts/fetch_realestate.py --months 1  --dry-run --limit 5
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from typing import Iterable

# ---- Django setup -----------------------------------------------------
from _django import require_env, setup

setup()

# ---- 상수 -------------------------------------------------------------
# 서울 25개 자치구 LAWD_CD (5자리)
SEOUL_LAWD_CODES = [
    "11110",  # 종로구
    "11140",  # 중구
    "11170",  # 용산구
    "11200",  # 성동구
    "11215",  # 광진구
    "11230",  # 동대문구
    "11260",  # 중랑구
    "11290",  # 성북구
    "11305",  # 강북구
    "11320",  # 도봉구
    "11350",  # 노원구
    "11380",  # 은평구
    "11410",  # 서대문구
    "11440",  # 마포구
    "11470",  # 양천구
    "11500",  # 강서구
    "11530",  # 구로구
    "11545",  # 금천구
    "11560",  # 영등포구
    "11590",  # 동작구
    "11620",  # 관악구
    "11650",  # 서초구
    "11680",  # 강남구
    "11710",  # 송파구
    "11740",  # 강동구
]

# data.go.kr 엔드포인트 (HTTPS)
ENDPOINTS = {
    "villa": "https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
    "house": "https://apis.data.go.kr/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent",
    "officetel": "https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
}


# ---- 응답 파서 (placeholder) ------------------------------------------
def parse_xml(xml_text: str) -> list[dict]:
    """국토부 실거래가 XML 응답 → dict 리스트.

    실제 키는 거래 유형마다 다르다. 호출 후 첫 페이지 인쇄해서 키 매핑 확정 필요.
    공통 후보: 법정동, 전용면적, 보증금액, 월세금액, 계약년월, 계약일.
    """

    # TODO: 실제 키 들어오면 xml.etree.ElementTree.fromstring 으로 파싱
    raise NotImplementedError("API 응답 받은 후 키 매핑 확정 필요")


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
        q1, q3 = np.percentile(values, [25, 75])
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        for i, r in enumerate(rows):
            v = r.get(col)
            if v is None:
                continue
            if v < lo or v > hi:
                keep[i] = False
    return [r for r, k in zip(rows, keep) if k]


# ---- 메인 -------------------------------------------------------------
def fetch_one_month(api_key: str, lawd_cd: str, deal_ym: str, deal_type: str) -> list[dict]:
    """한 자치구 + 한 달 분 호출 → row 리스트. (placeholder)"""

    # TODO: 키 들어오면 requests.get(ENDPOINTS[deal_type], params={...}) 후 parse_xml
    print(
        f"[DRY] would fetch {deal_type} LAWD_CD={lawd_cd} DEAL_YMD={deal_ym} "
        f"using key={api_key[:6]}..."
    )
    return []


def _persist_dryrun(rows: list[dict]) -> None:
    print(f"  rows fetched: {len(rows)} (DB 적재 SKIP — RentDeal 모델 미존재)")


# def _persist_db(rows: list[dict]) -> None:
#     """모델 추가 후 활성화. update_or_create 로 idempotent.
#
#     from apps.realestate.models import RentDeal
#     for r in rows:
#         RentDeal.objects.update_or_create(
#             dong_id=r["dong_id"],
#             deal_type=r["deal_type"],
#             deal_date=r["deal_date"],
#             area_m2=r["area_m2"],
#             defaults={"deposit": r["deposit"], "monthly_rent": r["monthly_rent"]},
#         )
#     """


def main() -> int:
    parser = argparse.ArgumentParser(description="국토부 실거래가(전월세) 적재 골격")
    parser.add_argument(
        "--months",
        type=int,
        default=12,
        help="현재로부터 과거 몇 개월 (기본 12)",
    )
    parser.add_argument(
        "--deal-type",
        choices=list(ENDPOINTS.keys()) + ["all"],
        default="all",
        help="거래 유형 (villa=연립다세대, house=단독다가구, officetel=오피스텔, all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="API 응답 확인만, DB 쓰기 없음 (현재 기본값과 동일)",
    )
    parser.add_argument("--limit", type=int, default=None, help="자치구 수 제한 (디버그)")
    args = parser.parse_args()

    api_key = require_env(
        "DATA_GO_KR_API_KEY",
        hint="data.go.kr 일반 인증키(Decoding). '국토교통부 실거래가 정보' 활용 신청 필요 (15126473/72/75)",
    )

    today = date.today()
    months: list[str] = []
    y, m = today.year, today.month
    for _ in range(args.months):
        months.append(f"{y:04d}{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1

    lawd_codes = SEOUL_LAWD_CODES[: args.limit] if args.limit else SEOUL_LAWD_CODES
    deal_types = list(ENDPOINTS.keys()) if args.deal_type == "all" else [args.deal_type]

    total = 0
    for deal_type in deal_types:
        for lawd_cd in lawd_codes:
            for ym in months:
                rows = fetch_one_month(api_key, lawd_cd, ym, deal_type)
                rows = clip_outliers(rows, columns=("deposit", "monthly_rent"))
                _persist_dryrun(rows)
                total += len(rows)

    print(f"\nDONE. total rows seen: {total}")
    print("실 적재를 위해서는 RentDeal 모델 추가 + _persist_db 활성화 필요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
