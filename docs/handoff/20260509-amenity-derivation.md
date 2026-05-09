# Phase 4.5 — Amenity derivation + 카테고리 가중 score + 차트 5종 시리즈

작성일: 2026-05-09
상태: **완료** — 187k Amenity row, 차트 4 시리즈, score 카테고리 가중 적용
선행 문서: `docs/handoff/20260509-phase4-scores.md`

---

## 완료된 작업

1. **`backend/scripts/etl/from_rds/18_amenity_from_store.py` 신규** — Store + Park raw → Amenity derived 적재.
2. **카테고리 매핑 사전** (subcategory_code → 우리 11종) — 코드 prefix + 정확매칭 + 브랜드 검색 혼합.
3. **`backend/scripts/compute_scores.py` 갱신** — `_collect_amenity_metrics`을 다시 Amenity 기반 카테고리 가중합으로 복원 (Phase 4의 임시 Store 단순 카운트 → 정밀 가중).
4. **프론트 RealEstateSection 차트 4 시리즈로 확장** — multi(=옛 단독다가구) 라인을 dagagu / danok 두 라인으로 분리.

---

## 매핑 사전 (subcategory_code → 11종)

| 우리 카테고리 | 매칭 규칙 |
|---|---|
| `convenience` | code = `G20405` |
| `mart` | code = `G20404` |
| `cafe` | code = `I21201` |
| `studycafe` | code = `R10202` |
| `pharmacy` | code = `G21501` |
| `laundry` | code IN (`S20901`, `S20902`) |
| `hospital` | code = `M11101` (동물병원) OR code STARTS WITH `Q10` (18 종) |
| `restaurant` | code STARTS WITH `I20` (40 종) OR code STARTS WITH `I21` (단 `I21201` 제외) |
| `oliveyoung` | name LIKE `%올리브영%` (브랜드 검색, 카테고리 매핑보다 **우선**) |
| `park` | Park 모델 (별도, source=`seoul_park`) |

매핑 실패 row(부동산·회계·광고 등 자취 amenity가 아닌 것들 ~ 349k)는 Amenity에 적재 안 함.

---

## 적재 결과 (Amenity 187,585 row)

| 카테고리 | 카운트 |
|---|---:|
| restaurant | 114,260 |
| cafe | 21,623 |
| hospital | 19,718 |
| convenience | 9,443 |
| mart | 7,906 |
| pharmacy | 5,247 |
| laundry | 4,580 |
| studycafe | 2,485 |
| park | 1,886 |
| oliveyoung | 437 |
| **합계** | **187,585** |

- store 535k 중 35%가 우리 11종에 매핑.
- 적재 시간 7.6초 (store→amenity 70k rps) + park 1초.

---

## score_amenity 카테고리 가중 효과

`AMENITY_WEIGHTS` (compute_scores.py — convenience 0.20, hospital 0.15, mart/restaurant/cafe/studycafe/pharmacy 0.10, laundry/oliveyoung/park 0.05) 가중 적용 후 분포는 백분위라 동일(mean 50, std 28.9)이지만 동별 순위에 미세 변동:

- **신규 top10 진입**: 서대문구 신촌동 A=98.8 (이전엔 비탑) — 학원/카페/병원 풍부
- 강남 역삼1동 100.0, 마포 서교동 99.8, 종로1·2·3·4가동 99.5 등 핵심 상권은 유지
- bottom: 용산 이촌2동 A=0.5, 종로 삼청동 A=8.9 (음식점 적음)

---

## 프론트 차트 4 시리즈 확장

### 변경 파일
- `frontend/src/lib/colors.ts` — `CHART_COLORS.multi` 제거, `dagagu` (#1863dc Action Blue), `danok` (#6b7280 Slate Mid) 추가
- `frontend/src/types/api.ts` — `monthly_trend.multi` 제거, `dagagu`/`danok` 추가
- `frontend/src/components/Detail/RealEstateSection.tsx` — Recharts Line 3개 → 4개 (villa / dagagu / danok / officetel)
- `backend/apps/neighborhoods/detail_dummy.py` — dummy `monthly_trend` 4 series로 확장 (apt 미포함, 시장 가격대 차이로 별도 chart 권장)

### 차트 색상 매핑 (4 series)
| 시리즈 | 색상 | 의도 |
|---|---|---|
| villa (연립다세대) | #212121 Ink | primary monochrome |
| dagagu (다가구) | #1863dc Action Blue | 자취 본진, secondary |
| danok (단독) | #6b7280 Slate Mid | tertiary mid-grey |
| officetel | #ff7759 Coral | warm accent |

`tsc --noEmit` 통과. Record<5종> 매핑 완전성 + Recharts 시리즈 dataKey 정합 확인.

---

## 재실행

```bash
cd /Users/bagjihyeon/Desktop/School/capston/backend
.venv/bin/python scripts/etl/from_rds/18_amenity_from_store.py    # 멱등 (ON CONFLICT)
.venv/bin/python scripts/compute_scores.py --mode real
```

---

## 알려진 제약 / 다음 후보

1. **카테고리 매핑 사전의 정밀도** — `M11101`(동물병원)이 hospital에 들어가는 것, `restaurant`에 주점/술집(I21104, I21105)이 포함되는 것 등은 단순 prefix 규칙. SPEC 6.3 화면 의도와 다르면 화이트리스트 정밀화 필요.
2. **studycafe** 2,485건이 실제 R10202(독서실/스터디 카페) 카테고리에서만 와서 협소. 대형 프랜차이즈(예: 작심독서실) 브랜드 검색 추가하면 더 정확.
3. **park area 가중 미반영** — 작은 1m² park도 1로 카운트. 면적 가중하면 더 정확하지만 학부 단순화로 미적용.
4. **운영 DB 이관** — 여전히 결정 대기 (Phase 1/2 마이그레이션 + 데이터).
