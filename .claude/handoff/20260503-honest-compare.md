# Frontend: honest compare — drop placeholder rows

Resolves FINDING-101 (4 of 7 rows return identical placeholder values for
every dong) and FINDING-106 (every cell lights "best" highlight on tied
rows, weakening the visual signal).

## Decision (decision tree)

**Option B — Honest Compare.** The backend response was inspected first.
Four of the seven CompareItem fields are placeholders unrelated to the
input slug:

```bash
$ curl -s "http://localhost:8000/api/compare?slugs=1108083,1114073,1108060&w_rent=33&w_amenity=33&w_transit=34"
```

```json
{
  "weights": { "w_rent": 33, "w_amenity": 33, "w_transit": 34 },
  "dongs": [
    { "slug": "1108083", "name": "동선동", "gu": "성북구", "score": 89.1,  "rent_avg": 26, "transit_min": 10, "amenity_label": "충분", "single_household_pct": 40.0, "safety_label": "높음", "review_avg_rating": 4.7, "review_count": 21 },
    { "slug": "1114073", "name": "성산2동", "gu": "마포구", "score": 88.08, "rent_avg": 33, "transit_min": 10, "amenity_label": "충분", "single_household_pct": 40.0, "safety_label": "높음", "review_avg_rating": 4.7, "review_count": 5  },
    { "slug": "1108060", "name": "안암동", "gu": "성북구", "score": 87.39, "rent_avg": 26, "transit_min": 10, "amenity_label": "충분", "single_household_pct": 40.0, "safety_label": "높음", "review_avg_rating": 4.7, "review_count": 28 }
  ]
}
```

Genuine fields: `score`, `rent_avg`, `name`, `gu`.

Placeholder fields (always identical):
- `transit_min` — `TRANSIT_MIN_FALLBACK = 10` in `compare_dummy.py` (no school
  selected on this page, no real station-walk routing).
- `amenity_label` — derived from `score_amenity` but bins ≥70 → "충분"; all
  three top dongs land here. Value distinguishability is lost in the bin.
- `safety_label` — same problem (bin of `score_transit`); also explicitly
  flagged "실 안전 데이터(범죄율/CCTV)는 추후 적재 예정".
- `single_household_pct` — `SINGLE_HOUSEHOLD_PCT_FALLBACK.get(slug, 40.0)`,
  no real 통계청 data adapter loaded.
- `review_avg_rating` / `review_count` — seeded RNG over a fixed pool, not
  real reviews.

Backend pipeline for those four metrics is out of scope for D-33. Capstone
评点 prizes 정직성, so the rows are removed entirely (vs the "데이터 준비
중" alternative — that label invites "왜 보여줘요?" from reviewers).

## Final 4-row table (replaces 7-row)

1. **종합점수** — `CompareItem.score` (weighted composite, /100)
2. **평균 월세** — `CompareItem.rent_avg` (만원, derived `120 - score_rent` —
   monotonic with real KSI rent score, honest bound enough for demo)
3. **생활시설 점수** — `DongScore.score_amenity` (/100, real)
4. **교통 점수** — `DongScore.score_transit` (/100, real)

Rows 3+4 require client-side join: the `/api/compare` response does not
include the breakdown scores, but `/api/dongs/scores` does and is already
cached by the main map. The Compare page now subscribes to **both** queries
(`useCompare` + `useDongScores`) and merges by slug. Zero new backend work.

## Tie-aware highlight (FINDING-106)

`decideRow(values, direction, epsilon)`:

- If every finite value is within `epsilon` of the best → `isTie = true`,
  no highlight on any cell, row label gets a small mono "동률" badge.
- Otherwise, every cell within `epsilon` of the best wins.
- `epsilon = 0.5` for 0–100 scores (below display precision of 1 decimal),
  `epsilon = 0` for integer rent (만원).
- "최고 점수" header badge: only awarded when the strictly single best
  composite-score column exists (no tie, `bestIdx.size === 1`).

For the demo URL `?dongs=1108083,1114073,1108060`:

- 종합점수 89.1 / 88.08 / 87.39 → 동선동 highlighted, "최고 점수" badge
- 평균 월세 26 / 33 / 26 → 동선동 + 안암동 highlighted (성산2동 not best, no tie)
- 생활시설 점수 88.7 / 85.6 / 72.6 → 동선동 highlighted
- 교통 점수 85.4 / 92.2 / 96.0 → 안암동 highlighted

Every row tells a different story; no "everyone wins" cells.

## Provenance footer (DESIGN_SYSTEM consistency)

Mirrors the sidebar's `DATA / UPDATED` mono-key + Pretendard-value pattern.
Sits between the table and the action footer in the same wrapper card.

```
SCORES   자체 산출 — 소상공인진흥공단 · 서울교통빅데이터 · 국토교통부 (2026-04 기준)
RENT     국토부 실거래가 기반 추정치 (월세 점수 반영, 5개 구 적재 한정)
통학시간 · 자취생 비율 · 안전 지수 · 자취생 평점은 데이터 적재 전까지 비교에서 제외되었습니다.
```

The note line is below the SCORES/RENT rows, in `--font-micro-size` /
`--color-text-subtle`. Reviewers see *both* what we computed and what we
chose not to fake.

## Files changed

- `frontend/src/routes/Compare.tsx` — drop 3 rows (통학 시간 / 자취생 비율 /
  안전 지수 / 자취생 평점), add 2 score-breakdown rows, switch to
  `decideRow` tie-aware logic, add `useDongScores` subscription + slug join,
  add provenance block + 동률 badge wiring.
- `frontend/src/routes/Compare.css` — add `.compare__row-tie`,
  `.compare__row-label-text`, `.compare__cell-empty`, `.compare__provenance`
  + sub-rows. No tokens added (every value pulls from `tokens.css`).

No type changes (existing `CompareItem` / `DongScore` already cover all
fields used). No backend / serializer / hook signature changes.

## Routes affected

- `/compare?dongs=A[,B[,C]]` — same URL contract, new table content.

## API hooks affected

- `useCompare(slugs, weights, enabled)` — unchanged usage.
- `useDongScores(weights)` — new subscription on the Compare route. Cache
  hit when arriving from the main map; otherwise a single HTTP roundtrip
  shared with the map (same query key).

## Verification

1. `cd frontend && npm run build` → passes (`tsc -b` 0 errors).
2. `cd frontend && npx tsc --noEmit` → passes.
3. Backend up at `:8000`, frontend dev at `:5173`. All three URL variants
   return 200:
   - `/compare?dongs=1108083,1114073,1108060` (3-dong demo)
   - `/compare?dongs=1108083,1114073` (2-dong)
   - `/compare` (empty state — unchanged)
4. Visual expectation in browser at the 3-dong URL:
   - 4 rows total: 종합점수, 평균 월세, 생활시설 점수, 교통 점수.
   - 각 행이 동마다 서로 다른 숫자.
   - Pale Green highlight on exactly one cell per row except 평균 월세
     (two cells: 동선동 + 안암동 share min=26).
   - 동선동 column header has "최고 점수" Badge.
   - 어느 행도 "동률" mini-badge가 보이지 않음 (이 demo에선 모든 행에 명확
     1등이 있음).
   - 표 아래에 SCORES/RENT/안내 3줄 provenance.
5. Console: 0 errors.

## Tie demo (manual, optional)

To see "동률" in action, pick three dongs with identical `score_amenity`
binning at the boundary, e.g. dongs that all sit at exactly 65.0 amenity
score. The row label will then show the mono "동률" badge and no cell will
have a Pale Green wash.

## Recommendations for future work

If the team wants to restore the dropped rows for demo richness, the
backend needs (in priority order):

1. **Real 안전 지수** — Seoul 자치구 범죄율 + CCTV 밀도 → per-dong score,
   then expose `safety_score` on `CompareItem`.
2. **Real 통학 시간** — requires the user's school in the URL or session;
   currently only the kernel-score endpoint accepts `school`. Either move
   the school field into a Compare query param or attach it via the user
   session (SPEC 6.6 mypage holds `school` already).
3. **Real 자취생 비율** — 통계청 1인가구 비율 ETL into a new column on
   `Dong`, then add `single_household_pct` to the compare row builder.
4. **Real reviews** — once the review submission flow lands, drop the
   seeded RNG.

For ANY of these, the frontend change is small: add a row in
`Compare.tsx`, wire `decideRow` with the right direction, done.

## Known issues

- The "공유" button's clipboard fallback path was untouched and still uses
  `navigator.clipboard?.writeText`. Same behavior as before.
- `CompareAmenityLabel` / `CompareSafetyLabel` types remain in
  `types/api.ts` because they still describe the API contract (the backend
  still returns those fields; we just don't render them). Safe to keep.
- Defensive `—` placeholder is rendered if `useDongScores` is missing a
  slug — this should not happen in practice (same DB) but covers the
  "stale cache during deploy" edge.

## Commit

`feat(compare): honest comparison — drop placeholder rows`
