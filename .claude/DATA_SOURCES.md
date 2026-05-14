# 자취맵 대시보드 — 데이터 소스 문서

마지막 업데이트: 2026-05-14

이 문서는 대시보드(`/dashboard`)의 모든 위젯이 사용하는 데이터 소스, 계산 방법, 데이터 단위 및 기간을 정리한다.
목적: (1) 원본 테이블 대조를 통한 데이터 정확성 검증, (2) 계산 로직 이해, (3) 파생 데이터의 잠재적 문제 식별.

---

## 목차

1. [헤더](#헤더)
2. [KPI 행 (Row 1)](#kpi-행-row-1)
3. [KPI 행 (Row 2)](#kpi-행-row-2)
4. [섹션 A. 부동산 시세](#섹션-a-부동산-시세)
5. [섹션 B. 편의시설](#섹션-b-편의시설)
6. [섹션 C. 교통](#섹션-c-교통)
7. [섹션 D. 인구·사회](#섹션-d-인구사회)
8. [섹션 E. 안전·환경·경제](#섹션-e-안전환경경제)
9. [섹션 F. 인기 차트](#섹션-f-인기-차트)
10. [섹션 G. 자취생 리뷰](#섹션-g-자취생-리뷰)
11. [gu_metric 메트릭 카탈로그](#gu_metric-메트릭-카탈로그)
12. [API 엔드포인트 요약](#api-엔드포인트-요약)
13. [알려진 문제 및 검증 포인트](#알려진-문제-및-검증-포인트)

---

## 헤더

| 위젯 | 데이터 소스 | API/Hook | 계산 방법 | 단위 | 데이터 기간 |
|---|---|---|---|---|---|
| **동 셀렉터** | `dong` 테이블 (426개 행정동) | `useDongScores` -> `DongScore[]` | 없음 (목록 조회) | — | 상시 |
| **한 줄 요약** | `adong` + `adong_population` 테이블 | `useDongSummary` | "OO구 OO동 · 면적 X㎢ · 인구 N명" 포맷 | ㎢, 명 | 인구: 월간 갱신 |

---

## KPI 행 (Row 1)

### 평균 환산 월세

| 항목 | 내용 |
|---|---|
| **DB 테이블** | `rent_deal` (국토부 RTMS 실거래가) |
| **API 경로** | `DongDetail.real_estate.studio_kpi.avg_converted_rent` |
| **계산 방법** | `monthly_rent + deposit * 0.005` (전월세 전환율 연 6% 기준, 월 0.5%) |
| **대상 거래** | 비아파트 자취 4종 (연립다세대, 다가구, 단독, 오피스텔) |
| **단위** | 만원 |
| **데이터 기간** | 최근 6개월 거래 기준 |

### 평균 보증금

| 항목 | 내용 |
|---|---|
| **DB 테이블** | `rent_deal` |
| **API 경로** | `DongDetail.real_estate.deposit_band_avg` |
| **계산 방법** | 보증금 구간별 가중평균 (밴드 중점 x 평균월세 가중) |
| **단위** | 만원 |
| **데이터 기간** | 최근 6개월 거래 기준 |

### 최근 거래 건수

| 항목 | 내용 |
|---|---|
| **DB 테이블** | `rent_deal` |
| **API 경로** | `DongDetail.real_estate.studio_kpi.recent_count` |
| **계산 방법** | 최근 6개월 비아파트 자취 거래 건수 단순 합산 |
| **단위** | 건 |
| **데이터 기간** | 최근 6개월 |

### 안전 지수 게이지

| 항목 | 내용 |
|---|---|
| **DB 테이블** | `gu_metric` (SAFETY_GRADE 필드) |
| **API 경로** | `DongSummary.safety_level` |
| **계산 방법** | 문자열 -> 수치 매핑: "high"->85, "mid"->55, "low"->25 |
| **단위** | 점 (0~100) |
| **데이터 기간** | 연간 (~2024-01) |
| **비고** | 구 단위 지표. "OO구 단위" 뱃지 표시 |

---

## KPI 행 (Row 2)

### 자취촌 지수 (0~100)

| 항목 | 내용 |
|---|---|
| **DB 테이블** | `rent_deal` (최근 365일) |
| **API 엔드포인트** | `GET /api/dongs/:slug/derived-indices` |
| **Hook** | `useDongDerivedIndices` (staleTime 30분) |
| **계산 공식** | `(0.5 * 비아파트 비율 + 0.3 * 소형면적 비율 + 0.2 * 월세 계약 건수 정규화) * 100` |
| **단위** | 점 (0~100) |
| **캐시** | 서버 일일 갱신 (Redis, TTL 5시간, 키: `derived_indices_all_dongs:v1:{YYYY-MM-DD}`) |

**세부 계산:**

| 구성 요소 | 가중치 | 정의 | 비고 |
|---|---|---|---|
| 비아파트 비율 | 0.5 | housing_type != 아파트 건수 / 전체 건수 | 아파트 246K, 다세대 122K, 오피스텔 91K, 다가구 91K, 단독 55K, 연립 9K |
| 소형 면적 비율 | 0.3 | area_m2 <= 25 건수 / 전체 건수 | 25㎡ 이하를 소형으로 정의 |
| 월세 계약 건수 정규화 | 0.2 | monthly_rent > 0 건수의 426동 min-max 정규화 | 전세(monthly_rent=0)는 분자에서 제외 |

**순위 산출:**
- 426개 동 전체 계산 후 score 내림차순 rank (동률은 같은 rank)
- `percentile = round(100 - (rank - 1) / N * 100)`

**라이브 검증:**
- 신림동: score 63.78, rank 21/426 (백분위 95) — 비아파트 82%, 소형 67%
- 역삼1동: score 58.59, rank 50 — 오피스텔 많아 비아파트 82%, 소형 38%
- 합정동: score 55.81, rank 66 — 비아파트 95%
- 필동: score 45.48, rank 152 — 거래량 적어 monthly_norm=0.04

### 계약 활발도

| 항목 | 내용 |
|---|---|
| **DB 테이블** | `rent_deal` + `adong_population` |
| **API 엔드포인트** | `GET /api/dongs/:slug/derived-indices` (동일 endpoint) |
| **계산 공식** | `12개월 전체 계약 건수 / AdongPopulation 최신 인구 * 1000` |
| **단위** | 회/천명 |
| **예외 처리** | 인구 0 또는 null이면 score, rank, percentile 모두 null -> "데이터 부족" 표시 |

---

## 섹션 A. 부동산 시세

| 위젯 | DB 테이블 | API 경로 | 계산 방법 | 단위 | 기간 |
|---|---|---|---|---|---|
| 월별 평균 환산월세 추이 | `rent_deal` | `DongDetail.real_estate.monthly_trend` | 월별 자취 4종 환산월세 평균 | 만원 | 12~36개월 |
| 주택 유형 분포 | `rent_deal` | `DongDetail.real_estate.type_avg` | housing_type별 최근 6개월 거래 건수 | 건 | 최근 6개월 |
| 면적 x 환산월세 산점도 | `rent_deal` | `DongDetail.real_estate.scatter` | 건별 area_m2 vs converted_rent | ㎡, 만원 | 최근 6개월 |
| 보증금 대역별 평균 월세 | `rent_deal` | `DongDetail.real_estate.deposit_band_avg` | 5개 구간별 평균 월세 | 만원 | 최근 6개월 |
| 지가 변동률 | `gu_metric` LAND_PRICE_CHANGE_RATE | `GET /api/dongs/:slug/gu-metrics` | 구 원본 + 25구 평균 비교 | % | 월간 (~2026-03) |
| 주택 수 | `gu_metric` HOUSING_COUNT | `GET /api/dongs/:slug/gu-metrics` | 구 원본 + 25구 평균 비교 | 호 | 연간 (~2024-01) |

**보증금 구간:** 0~500만 / 500~1000만 / 1000~2000만 / 2000~3000만 / 3000만+

---

## 섹션 B. 편의시설

| 위젯 | DB 테이블 | API | 계산 방법 | 비고 |
|---|---|---|---|---|
| 카테고리별 편의시설 | `store` + `business_category` + `ksci_category` | `DongDetail.amenities` | 8개 카테고리별 점포 수 | 편의점/카페/마트/음식점/병원약국/세탁소/올리브영/스터디카페 |
| 필수시설 충분도 | 위와 동일 | `DongDetail.amenities` | 인구 1만명당 -> 서울 백분위 | <50 부족 / 50~75 보통 / >=75 충분 |
| 대형 공원 | `park` + `park_adong` | `GET /api/dongs/:slug/parks` | 면적 desc, ST_DistanceSphere 거리 | 캐시 5분, 프론트 id dedupe |
| 도서관 | — | — | — | placeholder, DB 모델 미존재 |

---

## 섹션 C. 교통

| 위젯 | DB 테이블 | API | 계산 방법 | 비고 |
|---|---|---|---|---|
| 지하철 TOP 3 | `nearest_subway` | `DongDetail` | 사전계산 rank 1~3, 도보=distance_m/70 | |
| 버스 정류장/노선 | `bus_stop` | `DongDetail` | FK count, route=stop*3 추정 | 노선 데이터 부재 |
| 1인당 차량 등록 | `gu_metric` | `gu-metrics` | VEHICLE_REGISTERED / POP_RESIDENT | 구 단위 |
| 지하철 혼잡도 | `subway_congestion` | `transit-congestion` | TOP3역 day_type별 hour 평균 | 캐시 5분 |
| 버스 혼잡도 | `bus_congestion` | `transit-congestion` | 동 내 정류장 60일, DOW 분리 | BusStop FK 주의 |
| 동 성격 추정 | 혼잡도 파생 | `transit-congestion` personality | 임계값 기반 분류 | 오분류 가능 |

**지하철 혼잡도 집계 규칙:**
- direction(상선/하선/내선/외선), express_yn(일반/급행) 전부 합산 평균
- 휴일 day_type -> 일요일 버킷에 가중평균으로 합침
- 30분 단위 raw -> 같은 hour로 추가 평균
- 빈 슬롯은 `{hour: H, congestion: null}`. 24슬롯 보장

**동 성격 분류 규칙 (우선순위순):**

| 우선순위 | 조건 | 라벨 |
|---|---|---|
| 1 | weekend_avg / weekday_full_avg > 1.2 | 유동인구 많음 |
| 2 | midday / morning_peak > 0.8 | 상업·업무 중심 |
| 3 | morning_peak / midday > 1.5 AND evening_peak / midday > 1.3 | 주거 중심 |
| 4 | 모두 불충족 | null (특징 추정 보류) |

**시간대:** morning_peak(7~9시), midday(11~14시), evening_peak(18~20시), weekend(토+일 평균)

**알려진 문제:** 임계값 경계에서 오분류 가능. 합정동 "주거 중심"(실제 상업 다수), 역삼1동 null(경계값).

---

## 섹션 D. 인구·사회

| 위젯 | DB 테이블 | API | 계산 방법 | 단위 | 비고 |
|---|---|---|---|---|---|
| 남녀 비율 | `adong_population` | `population` | male/female 최신행 | 명, % | 동 단위 |
| 인구 추이 | `adong_population` | `population` trend | 월별 total+household 시계열 | 명, 세대 | 2022.09~ |
| 청년 비율 | `gu_metric` | `gu-metrics` | YOUTH_19_34/TOTAL_BASE*100 | % | 구 단위, 25구 비교 |
| 평균 연령 | `gu_metric` | `gu-metrics` | MEAN_AGE 원본 (전체/남/여) | 세 | 구 단위 |
| 고령 비율 | `gu_metric` | `gu-metrics` | ELDERLY_RATIO 원본 | % | **삭제 예정** |
| 1인 가구 추정 | `adong_population` | `population` | (2-avg_per_household)*100 | % | **거친 추정** |

---

## 섹션 E. 안전·환경·경제

> 모든 위젯 **구 단위**, "OO구 단위" 뱃지 표시

| 위젯 | DB 테이블 | 계산 방법 | 단위 | 기간 |
|---|---|---|---|---|
| 안전 등급 6분야 레이더 | SAFETY_GRADE_TRAFFIC~SUICIDE | 6분야 + 25구 평균 | 등급 1~5 | ~2024-01 |
| 교통사고 통계 | ACC_TOTAL/INJURY/DRUNK/HITRUN | 음주비율=DRUNK/TOTAL*100 | 건, % | ~2024-01 |
| 교통사고 추이 | ACC_TOTAL_COUNT series | 10년치 + 25구 평균선 | 건 | 10년 |
| 교통문화지수 레이더 | TRAFFIC_CULTURE_* | 5개 지표 + 25구 평균 | 점 0~100 | ~2025-01 |
| GRDP | GRDP_CURRENT | 총액/1M(조원), 1인당=GRDP/POP | 조원 | ~2022-01 |
| 녹지 비율 | AREA_GREEN, AREA_URBAN | GREEN/(GREEN+URBAN)*100 | % | ~2024-01 |
| 1인당 녹지 | AREA_GREEN, POP_RESIDENT | GREEN/POP | ㎡/명 | **삭제 예정** |
| 화재 추이 | FIRE_COUNT series | 시계열 + 25구 평균선 | 건 | ~2025-01 |

---

## 섹션 F. 인기 차트

| 위젯 | 데이터 소스 | 계산 방법 | 비고 |
|---|---|---|---|
| 서울 자취 TOP 10 | `useDongScores` | composite score desc -> 상위 10 | 현재 동 하이라이트 |
| 학교별 TOP 5 | `useDongScores` (폴백) | 종합 점수 폴백 | ranking API 미구현 |
| 인근 비슷한 동 | `DongDetail.similar_dongs` | 코사인 유사도 상위 3 | 카드 3장 |

---

## 섹션 G. 자취생 리뷰

| 위젯 | 데이터 소스 | 비고 |
|---|---|---|
| 평균 별점 / 리뷰 수 | `DongDetail.reviews` | **현재 mock 데이터** |
| 리뷰 카드 가로 스크롤 | `DongDetail.reviews` | 현재 mock 데이터 |

---

## gu_metric 메트릭 카탈로그

### 인구 (13종)

| 코드 | 이름 | 단위 | 주기 | 최신 |
|---|---|---|---|---|
| POP_RESIDENT | 주민등록인구 | 명 | 월간 | ~2026-04 |
| POP_TOTAL | 총인구 | 명 | 월간 | ~2026-03 |
| POP_ELDERLY_RATIO | 고령인구 비율 | % | 월간 | ~2026-03 |
| POP_YOUTH_19_34 | 청년인구 19~34세 | 명 | 연간 | ~2024-01 |
| POP_YOUTH_19_39 | 청년인구 19~39세 | 명 | 연간 | ~2024-01 |
| POP_TOTAL_YOUTH_BASE | 청년비율 기반 인구 | 명 | 연간 | ~2024-01 |
| POP_MEAN_AGE | 평균 연령 (전체) | 세 | 연간 | ~2024-01 |
| POP_MEAN_AGE_MALE | 평균 연령 (남) | 세 | 연간 | ~2024-01 |
| POP_MEAN_AGE_FEMALE | 평균 연령 (여) | 세 | 연간 | ~2024-01 |
| 그 외 4종 | — | — | — | — |

### 안전 (7종)

| 코드 | 이름 | 단위 | 주기 | 최신 |
|---|---|---|---|---|
| SAFETY_GRADE_TRAFFIC | 지역안전등급 교통사고 | 등급 1~5 | 연간 | ~2024-01 |
| SAFETY_GRADE_CRIME | 지역안전등급 범죄 | 등급 1~5 | 연간 | ~2024-01 |
| SAFETY_GRADE_FIRE | 지역안전등급 화재 | 등급 1~5 | 연간 | ~2024-01 |
| SAFETY_GRADE_DISEASE | 지역안전등급 감염병 | 등급 1~5 | 연간 | ~2024-01 |
| SAFETY_GRADE_LIFE | 지역안전등급 생활안전 | 등급 1~5 | 연간 | ~2024-01 |
| SAFETY_GRADE_SUICIDE | 지역안전등급 자살 | 등급 1~5 | 연간 | ~2024-01 |
| SAFETY_GRADE_MEAN | 지역안전등급 평균 | 등급 1~5 | 연간 | ~2024-01 |

### 교통 (10종)

| 코드 | 이름 | 단위 | 주기 | 최신 |
|---|---|---|---|---|
| ACC_TOTAL_COUNT | 교통사고 총 건수 | 건 | 연간 | ~2024-01 |
| ACC_INJURY_COUNT | 교통사고 부상자 | 명 | 연간 | ~2024-01 |
| ACC_DRUNK_COUNT | 음주운전 사고 | 건 | 연간 | ~2024-01 |
| ACC_HITRUN_COUNT | 뺑소니 사고 | 건 | 연간 | ~2024-01 |
| VEHICLE_REGISTERED | 차량 등록대수 | 대 | 연간 | ~2024-01 |
| TRAFFIC_CULTURE_INDEX | 교통문화지수 종합 | 점 0~100 | 연간 | ~2025-01 |
| TRAFFIC_SAFETY | 교통문화 운전행태(안전) | 점 | 연간 | ~2025-01 |
| TRAFFIC_WALK | 교통문화 보행행태 | 점 | 연간 | ~2025-01 |
| TRAFFIC_DRIVE | 교통문화 운전행태(주행) | 점 | 연간 | ~2025-01 |
| TRAFFIC_VULNERABLE | 교통문화 교통약자보호 | 점 | 연간 | ~2025-01 |

### 환경 (2종)

| 코드 | 이름 | 단위 | 주기 | 최신 |
|---|---|---|---|---|
| AREA_GREEN | 녹지면적 | ㎡ | 연간 | ~2024-01 |
| AREA_URBAN | 도시면적 | ㎡ | 연간 | ~2024-01 |

### 경제 (4종)

| 코드 | 이름 | 단위 | 주기 | 최신 |
|---|---|---|---|---|
| GRDP_CURRENT | 지역내총생산 | 백만원 | 연간 | ~2022-01 |
| LAND_PRICE_CHANGE_RATE | 지가 변동률 | % | 월간 | ~2026-03 |
| HOUSING_COUNT | 주택 수 | 호 | 연간 | ~2024-01 |
| FIRE_COUNT | 화재 발생건수 | 건 | 연간 | ~2025-01 |

### 데이터 기간 요약

| 갱신 주기 | 해당 메트릭 | 최신 시점 |
|---|---|---|
| **월간** | POP_RESIDENT* | ~2026-04 |
| **월간** | POP_TOTAL, POP_ELDERLY_RATIO | ~2026-03 |
| **월간** | LAND_PRICE_CHANGE_RATE | ~2026-03 |
| **연간** | SAFETY_GRADE_*, POP_YOUTH_*, POP_MEAN_AGE*, ACC_*, VEHICLE_REGISTERED, HOUSING_COUNT | ~2024-01 |
| **연간** | TRAFFIC_CULTURE_*, FIRE_COUNT | ~2025-01 |
| **연간** | AREA_GREEN, AREA_URBAN | ~2024-01 |
| **연간** | GRDP_CURRENT | ~2022-01 |

### 25구 평균/순위 체계

단일값 응답 키:
- `rank_in_seoul`: 25구 중 값 큰 순 1위 (null이면 null)
- `gu_count`: 데이터 보유 구 수 (일반적으로 25)
- `gu_avg`: 25구 산술 평균

시계열 추가 키:
- `current_rank`: 최신 non-null point 기준 순위
- `gu_avg_series`: date별 25구 산술 평균 시계열

> 기존 `seoul_avg`/`seoul_series`는 SeoulMetric raw(서울 전체 합/대표값)로 구 비교에 부적절. 대시보드에서는 `gu_avg`/`gu_avg_series` 사용.

---

## API 엔드포인트 요약

### 기존 Hook 활용

| Hook | 대시보드 활용 |
|---|---|
| `useDongScores` | 동 셀렉터, 인기 차트 TOP 10 |
| `useDongSummary` | 헤더 한 줄 요약, KPI 안전 게이지 |
| `useDongDetail` | 섹션 A~C 일부, F(비슷한 동), G(리뷰) |

### 대시보드 전용 엔드포인트

| 엔드포인트 | 용도 | 캐시 TTL | Hook |
|---|---|---|---|
| `GET /api/dongs/:slug/population` | 인구 시계열 | 10분 | `useDongPopulation` |
| `GET /api/dongs/:slug/gu-metrics` | 구 지표 35종 최신값 | 5분 | `useDongGuMetrics` |
| `GET /api/dongs/:slug/gu-metrics/series?codes=A,B&years=10` | 구 지표 시계열 | 5분 | `useDongGuMetricsSeries` |
| `GET /api/dongs/:slug/derived-indices` | 자취촌 지수 + 계약 활발도 | 5시간 | `useDongDerivedIndices` |
| `GET /api/dongs/:slug/transit-congestion` | 혼잡도 + 동 성격 추정 | 5분 | `useDongTransitCongestion` |
| `GET /api/dongs/:slug/parks` | 대형 공원 목록 | 5분 | `useDongParks` |

### 미구현 엔드포인트

| 항목 | 상태 | 비고 |
|---|---|---|
| 학교별 ranking API | 미구현 | 학교별 TOP 5에 필요 |
| 도서관 API | 미구현 | DB 모델 미존재 |
| 미니맵 per-layer scores | 미구현 | 현재 composite 폴백 |
| `POST /api/ai/chat` | stub | AI 미연결, mock 응답 |

---

## 알려진 문제 및 검증 포인트

### 데이터 정확성 검증 필요 항목

| # | 항목 | 문제 | 검증 방법 |
|---|---|---|---|
| 1 | **동 성격 추정 임계값** | 합정동 "주거 중심" 오분류, 역삼1동 null | 426동 전체 분류 확인 후 임계값 조정 |
| 2 | **1인 가구 추정** | (2 - avg) * 100 거친 추정 | 통계청 1인 가구 데이터와 비교 |
| 3 | **버스 노선 수** | stop * 3 단순 추정 | 실제 노선 데이터 확보 시 교정 |
| 4 | **녹지 비율 분모** | AREA_URBAN 정의 미확인 | gu_metric 원본 데이터 정의서 확인 |
| 5 | **GRDP 단위** | 클라이언트 단위 변환, 서버 unit 무시 | 서버/클라이언트 동기화 필요 |
| 6 | **안전 지수 매핑** | high->85, mid->55, low->25 근거 불명확 | 매핑 타당성 검토 |
| 7 | **자취촌 지수 가중치** | 0.5/0.3/0.2 초안 | 분포 분석 후 가중치 재조정 |

### DB FK 주의사항

| 테이블 | FK 필드 | 주의점 |
|---|---|---|
| `RentDeal` | `dong` | `Dong.id`(int) FK |
| `AdongPopulation` | `dong` | to_field=code -> dong_id에 code 문자열이 들어감 |
| `BusStop` | `dong` | to_field=code -> 반드시 `BusStop.objects.filter(dong__id=dong.id)` 조인 |

### 삭제 예정 위젯

- 고령 인구 비율 (대학생 타겟과 관련도 낮음)
- 1인당 녹지

---

## 부록: DB 테이블 -> 위젯 역매핑

| DB 테이블 | 사용 위젯 |
|---|---|
| `rent_deal` | 환산월세, 보증금, 거래건수, 자취촌 지수, 계약 활발도, 월별 추이, 유형 분포, 산점도, 보증금 대역 |
| `adong` | 헤더 한 줄 요약 |
| `adong_population` | 헤더 인구, 계약 활발도, 남녀 비율, 인구 추이, 1인 가구 추정 |
| `gu_metric` | 안전 게이지, 지가 변동률, 주택 수, 청년 비율, 평균 연령, 고령 비율, 안전 레이더, 교통사고, 교통문화지수, GRDP, 녹지, 화재, 차량 등록 |
| `store` + `business_category` + `ksci_category` | 편의시설, 충분도 |
| `park` + `park_adong` | 대형 공원 |
| `nearest_subway` | 지하철 TOP 3 |
| `subway_congestion` | 지하철 혼잡도, 동 성격 추정 |
| `bus_stop` | 버스 정류장/노선 |
| `bus_congestion` | 버스 혼잡도, 동 성격 추정 (subway 없을 때) |
| `dong` (DongScore) | 동 셀렉터, TOP 10, 학교별 TOP 5 |
