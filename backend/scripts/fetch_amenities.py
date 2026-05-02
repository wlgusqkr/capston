"""소상공인진흥공단 상가(상권)정보 API 적재 스크립트 — 골격.

데이터 출처
-----------
- data.go.kr 15012005 (소상공인시장진흥공단_상가(상권)정보)
- 행정동 단위 카테고리별 시설 수 집계 → SPEC 6.3 편의시설 섹션의 입력.

CURRENT STATUS
--------------
**모델 미존재.** apps/amenities/Amenity (SPEC 10) 미구현.
적재 시 필요한 카테고리 매핑은 아래 CATEGORY_MAP 참고.

Usage
-----
    export SBA_API_KEY=...
    python scripts/fetch_amenities.py --gu 중구
    python scripts/fetch_amenities.py --dry-run --limit 100
"""

from __future__ import annotations

import argparse
import sys

from _django import require_env, setup

setup()


# 소상공인진흥공단 표준산업분류 코드 → SPEC 6.3 카테고리 매핑.
# 실제 코드 정의는 API 문서의 '상권업종대분류 / 중분류' 표 참고.
CATEGORY_MAP = {
    # 편의점, 마트
    "D03A01": "편의점",
    "D03A02": "마트",
    # 음식점
    "Q01A01": "음식점",
    # 카페, 스터디카페
    "Q02A01": "카페",
    "Q02A02": "스터디카페",
    # 의료
    "S02A01": "병원",
    "S02A02": "약국",
    # 생활편의
    "F03A01": "세탁소",
    # 화장품 (올리브영 등)
    "G02A02": "올리브영",
}


ENDPOINT = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong"


def fetch_dong(api_key: str, adm_cd: str, page_no: int = 1) -> list[dict]:
    """행정동 코드(adm_cd, 8자리) 1개 분 호출 — placeholder.

    한 페이지 = 최대 1000개. 페이지네이션 필요.
    """

    # TODO: requests.get(ENDPOINT, params={"key": api_key, "divId": "adongCd", "key": adm_cd,
    #                                       "pageNo": page_no, "numOfRows": 1000, "type": "json"})
    print(
        f"[DRY] would fetch amenities for adm_cd={adm_cd} page={page_no} "
        f"using key={api_key[:6]}..."
    )
    return []


def aggregate_by_category(rows: list[dict]) -> dict[str, int]:
    """API 응답에서 표준산업분류코드를 SPEC 카테고리로 변환 후 카운트."""

    counts: dict[str, int] = {}
    for r in rows:
        # API 응답 필드명: indsLclsCd / indsMclsCd / indsSclsCd 중 하나
        code = (r.get("indsMclsCd") or "")[:6]
        category = CATEGORY_MAP.get(code)
        if not category:
            continue
        counts[category] = counts.get(category, 0) + 1
    return counts


def _persist_dryrun(adm_cd: str, counts: dict[str, int]) -> None:
    print(f"  adm_cd={adm_cd} categories={counts} (DB 적재 SKIP — Amenity 모델 미존재)")


# def _persist_db(adm_cd: str, rows: list[dict]) -> None:
#     """모델 추가 후 활성화.
#
#     from apps.amenities.models import Amenity
#     from apps.neighborhoods.models import Dong
#     dong = Dong.objects.get(code=adm_cd)
#     for r in rows:
#         Amenity.objects.update_or_create(
#             external_id=r["bizesId"],
#             defaults={
#                 "dong": dong,
#                 "category": CATEGORY_MAP.get(r.get("indsMclsCd","")[:6], "기타"),
#                 "name": r["bizesNm"],
#                 "location": Point(float(r["lon"]), float(r["lat"]), srid=4326),
#             },
#         )
#     """


def main() -> int:
    parser = argparse.ArgumentParser(description="소상공인진흥공단 상가정보 적재 골격")
    parser.add_argument(
        "--gu",
        default=None,
        help="특정 구만 처리 (예: '중구'). 미지정 시 전체.",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None, help="처리 동 수 제한")
    args = parser.parse_args()

    api_key = require_env(
        "SBA_API_KEY",
        hint="data.go.kr 또는 sg.sbiz.or.kr 에서 '상가(상권)정보' 활용 신청 후 발급",
    )

    # 행정동 목록은 Dong 테이블에서 가져옴 (10단계 적재 후 426개 모두 채워짐)
    from apps.neighborhoods.models import Dong  # noqa: E402

    qs = Dong.objects.all()
    if args.gu:
        qs = qs.filter(gu=args.gu)
    if args.limit:
        qs = qs[: args.limit]

    if not qs.exists():
        print("[WARN] Dong 테이블이 비어 있습니다. 먼저 build_dong_mapping.py + load_dongs 적재 필요.")
        return 1

    total = 0
    for dong in qs.iterator():
        rows = fetch_dong(api_key, dong.code)
        counts = aggregate_by_category(rows)
        _persist_dryrun(dong.code, counts)
        total += sum(counts.values())

    print(f"\nDONE. total amenities seen: {total}")
    print("실 적재를 위해서는 Amenity 모델 추가 + _persist_db 활성화 필요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
