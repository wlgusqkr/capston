"""법정동 ↔ 행정동 매핑 테이블 생성 — 골격.

배경 (SPEC 14.2)
----------------
실거래가 API는 **법정동** 단위, 우리 서비스는 **행정동** 단위.
한 법정동이 여러 행정동에 걸쳐 있을 수 있고 (1:N), 반대도 있다 (N:1).
정확한 매핑은 행정안전부 코드(법정동 코드 10자리, 행정동 코드 8자리)를 사용.

이 스크립트는 두 가지 역할:
1. 행정동 GeoJSON 파일을 읽어 행정동 코드/이름을 정리하고 (load_dongs 명령의 입력 사양)
2. 별도 매핑 CSV (법정동코드, 행정동코드, 행정동명, 비율) 를 생성한다.

실 데이터 소스
--------------
- 행정동 GeoJSON: 국가공간정보포털 (nsdi.go.kr) 또는 통계청 SGIS.
- 법정동→행정동 매핑: 행정안전부 (mois.go.kr) '주민등록 거주자수' 첨부 또는
  공공데이터포털 '행정안전부_지역별 행정동 코드' 데이터셋.

CURRENT STATUS
--------------
GeoJSON 파일이 없으면 키 안내 후 종료. 파일이 있으면 행정동 코드 목록만 출력.
법정동→행정동 비율 매핑 (가중치 분배)은 매핑 CSV 받은 뒤 1:1 채택 (가장 큰 비율 대표).

Usage
-----
    python scripts/build_dong_mapping.py path/to/seoul_dongs.geojson
    python scripts/build_dong_mapping.py path/to/seoul_dongs.geojson \
        --bjd-mapping path/to/bjd_to_adm.csv --output mapping.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path


def parse_geojson(path: Path) -> list[dict]:
    """행정동 GeoJSON FeatureCollection → 코드/이름 리스트."""

    with path.open(encoding="utf-8") as f:
        gj = json.load(f)
    features = gj.get("features", [])
    print(f"  features: {len(features)}")

    out: list[dict] = []
    for feat in features:
        props = feat.get("properties", {})
        # 키는 데이터셋마다 다름. 흔한 후보:
        code = (
            props.get("ADM_CD")
            or props.get("adm_cd")
            or props.get("EMD_CD")
            or props.get("ADM_DR_CD")
            or ""
        )
        name = (
            props.get("ADM_NM")
            or props.get("adm_nm")
            or props.get("EMD_KOR_NM")
            or props.get("ADM_DR_NM")
            or ""
        )
        if not code or not name:
            continue
        out.append({"adm_cd": str(code), "adm_nm": name})
    return out


def parse_bjd_mapping(path: Path) -> list[dict]:
    """행안부 법정동→행정동 매핑 CSV.

    예상 컬럼 (CSV 헤더 — 데이터셋에 따라 보정 필요):
        법정동코드, 법정동명, 행정동코드, 행정동명, 비율(%)

    한 법정동이 여러 행정동에 분배되는 경우 비율(%)이 100 미만이고
    같은 법정동코드가 여러 행 등장한다.
    """

    rows: list[dict] = []
    with path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(
                {
                    "bjd_cd": (r.get("법정동코드") or r.get("bjd_cd") or "").strip(),
                    "bjd_nm": (r.get("법정동명") or r.get("bjd_nm") or "").strip(),
                    "adm_cd": (r.get("행정동코드") or r.get("adm_cd") or "").strip(),
                    "adm_nm": (r.get("행정동명") or r.get("adm_nm") or "").strip(),
                    "ratio": float(r.get("비율(%)") or r.get("ratio") or 100),
                }
            )
    return rows


def collapse_to_primary(mapping: list[dict]) -> dict[str, dict]:
    """법정동 1개 → 가장 비율 높은 행정동 1개. (학부 데모 단순화)

    SPEC 14.2 의 정확한 분배는 추후 점수 가중 분배에서 별도 처리.
    """

    by_bjd: dict[str, dict] = {}
    for r in mapping:
        cur = by_bjd.get(r["bjd_cd"])
        if cur is None or r["ratio"] > cur["ratio"]:
            by_bjd[r["bjd_cd"]] = r
    return by_bjd


def main() -> int:
    parser = argparse.ArgumentParser(description="행정동 GeoJSON 검증 + 법정동 매핑 생성")
    parser.add_argument("geojson", help="행정동 GeoJSON 파일 경로")
    parser.add_argument(
        "--bjd-mapping",
        default=None,
        help="행안부 법정동→행정동 매핑 CSV (선택)",
    )
    parser.add_argument(
        "--output",
        default="bjd_to_adm_primary.csv",
        help="출력 매핑 CSV 경로",
    )
    args = parser.parse_args()

    gj_path = Path(args.geojson)
    if not gj_path.exists():
        print(f"[ERROR] GeoJSON 파일이 없습니다: {gj_path}", file=sys.stderr)
        return 1

    print(f"\n[1/2] {gj_path.name} 파싱")
    adm_rows = parse_geojson(gj_path)
    print(f"  unique 행정동 코드: {len(set(r['adm_cd'] for r in adm_rows))}")

    if not args.bjd_mapping:
        print(
            "\n법정동→행정동 매핑 CSV 미지정 — 적재 단계로는 부족.\n"
            "  공공데이터포털 '행정안전부_지역별 행정동 코드' 또는\n"
            "  행안부 자료실의 '법정동/행정동 변환표' 다운로드 후 --bjd-mapping 으로 지정.",
        )
        return 0

    bjd_path = Path(args.bjd_mapping)
    if not bjd_path.exists():
        print(f"[ERROR] 매핑 CSV 가 없습니다: {bjd_path}", file=sys.stderr)
        return 1

    print(f"\n[2/2] {bjd_path.name} 파싱 + 법정동→대표 행정동 1:1 축약")
    raw = parse_bjd_mapping(bjd_path)
    primary = collapse_to_primary(raw)
    print(f"  unique 법정동: {len(primary)}")

    # 행정동 코드가 GeoJSON 에 없는 경우 경고
    adm_set = {r["adm_cd"] for r in adm_rows}
    missing = [r for r in primary.values() if r["adm_cd"] not in adm_set]
    if missing:
        print(f"  [WARN] GeoJSON 에 매칭되지 않는 행정동: {len(missing)} 건 (예: {missing[:3]})")

    out_path = Path(args.output)
    with out_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["bjd_cd", "bjd_nm", "adm_cd", "adm_nm", "ratio"])
        w.writeheader()
        for r in primary.values():
            w.writerow(r)
    print(f"\nDONE. wrote {out_path} ({len(primary)} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
