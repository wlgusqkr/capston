"""Recompute current_adong.score_amenity from current amenity source tables.

This keeps the current Adong + current_adong API surface intact and changes only
the score source value.  The formula follows DATA_SOURCES.md DECISIONS O-2:

    score_amenity = 0.609 * life + 0.108 * medical + 0.283 * park

life/medical use log1p(density) with a p95 anchor.  Park uses the natural
park-area ratio, capped at 1.

Usage:
    python scripts/scoring/recompute_current_adong_amenity.py
    python scripts/scoring/recompute_current_adong_amenity.py --slug 강북구-우이동
    python scripts/scoring/recompute_current_adong_amenity.py --apply
"""

from __future__ import annotations

import argparse
import math
import statistics
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _django import setup  # noqa: E402

setup()

from django.db import connection, transaction  # noqa: E402
from django.db.models import Count, F  # noqa: E402

from apps.public_data.regions.models import Adong  # noqa: E402
from apps.service.amenities.models import AmenityAdong  # noqa: E402
from apps.service.scoring.models import CurrentAdong  # noqa: E402


LIFE_WEIGHT = 0.609
MEDICAL_WEIGHT = 0.108
PARK_WEIGHT = 0.283

ANCHOR_PCTL = 0.95

# Matches the detail-page "생활시설" surface.  Transit/university/library/etc are
# intentionally excluded from the lifestyle amenity score.
LIFE_CATEGORIES = (
    "convenience",
    "mart",
    "restaurant",
    "cafe",
    "studycafe",
    "laundry",
    "oliveyoung",
)
MEDICAL_CATEGORIES = ("hospital", "pharmacy")


@dataclass(frozen=True)
class AmenityRow:
    code: str
    slug: str
    gu: str
    name: str
    current_score: float | None
    new_score: float
    delta: float | None
    area_km2: float
    life_count: int
    life_density: float
    life_signal: float
    life_points: float
    medical_count: int
    medical_density: float
    medical_signal: float
    medical_points: float
    park_count: int
    park_area_m2: float
    park_area_ratio: float
    park_signal: float
    park_points: float


def _continuous_percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]

    ordered = sorted(values)
    pos = (len(ordered) - 1) * percentile
    low = math.floor(pos)
    high = math.ceil(pos)
    if low == high:
        return ordered[low]
    return ordered[low] * (high - pos) + ordered[high] * (pos - low)


def _amenity_counts_by_adong() -> dict[str, dict[str, int]]:
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in (
        AmenityAdong.objects.values("adong_id", category=F("amenity__category"))
        .annotate(n=Count("amenity_id"))
        .iterator()
    ):
        counts[row["adong_id"]][row["category"]] = row["n"]
    return counts


def _park_stats_by_adong() -> dict[str, tuple[int, float]]:
    """Return park count and actual park area inside each Adong boundary.

    `park_adong` can map a large park to multiple administrative dongs.  Summing
    full park areas per mapping overcounts those parks, so use the spatial
    intersection area instead.
    """

    sql = """
        SELECT
            a.adong_code,
            COUNT(DISTINCT p.id) AS n,
            COALESCE(
                SUM(
                    ST_Area(
                        ST_Intersection(
                            ST_MakeValid(a.boundary),
                            ST_MakeValid(p.boundary)
                        )::geography
                    )
                ),
                0
            ) AS area_m2
        FROM park_adong pa
        JOIN adong a ON a.adong_code = pa.adong_code
        JOIN park p ON p.id = pa.park_id
        WHERE a.boundary IS NOT NULL
          AND p.boundary IS NOT NULL
          AND ST_Intersects(a.boundary, p.boundary)
        GROUP BY a.adong_code
    """
    with connection.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    return {code: (int(count), float(area_m2 or 0.0)) for code, count, area_m2 in rows}


def _current_amenity(adong: Adong) -> float | None:
    try:
        value = adong.current_score.score_amenity
    except CurrentAdong.DoesNotExist:
        return None
    return float(value) if value is not None else None


def _build_rows() -> tuple[list[AmenityRow], float, float]:
    adongs = list(Adong.objects.select_related("gu", "current_score").order_by("adong_code"))
    category_counts = _amenity_counts_by_adong()
    park_stats = _park_stats_by_adong()

    life_logs: list[float] = []
    medical_logs: list[float] = []
    prepared: list[tuple[Adong, float, int, int, float, float]] = []
    for adong in adongs:
        area_km2 = float(adong.area_m2 or 0.0) / 1_000_000.0
        counts = category_counts[adong.adong_code]
        life_count = sum(counts.get(category, 0) for category in LIFE_CATEGORIES)
        medical_count = sum(counts.get(category, 0) for category in MEDICAL_CATEGORIES)
        life_density = life_count / area_km2 if area_km2 > 0 else 0.0
        medical_density = medical_count / area_km2 if area_km2 > 0 else 0.0
        life_log = math.log1p(life_density)
        medical_log = math.log1p(medical_density)
        life_logs.append(life_log)
        medical_logs.append(medical_log)
        prepared.append((adong, area_km2, life_count, medical_count, life_log, medical_log))

    life_p95_log = _continuous_percentile(life_logs, ANCHOR_PCTL)
    medical_p95_log = _continuous_percentile(medical_logs, ANCHOR_PCTL)

    rows: list[AmenityRow] = []
    for adong, area_km2, life_count, medical_count, life_log, medical_log in prepared:
        life_density = life_count / area_km2 if area_km2 > 0 else 0.0
        medical_density = medical_count / area_km2 if area_km2 > 0 else 0.0
        life_signal = min(1.0, life_log / life_p95_log) if life_p95_log > 0 else 0.0
        medical_signal = (
            min(1.0, medical_log / medical_p95_log) if medical_p95_log > 0 else 0.0
        )

        park_count, park_area_m2 = park_stats.get(adong.adong_code, (0, 0.0))
        adong_area_m2 = float(adong.area_m2 or 0.0)
        park_area_ratio = park_area_m2 / adong_area_m2 if adong_area_m2 > 0 else 0.0
        park_signal = min(1.0, park_area_ratio)

        life_points = LIFE_WEIGHT * life_signal * 100.0
        medical_points = MEDICAL_WEIGHT * medical_signal * 100.0
        park_points = PARK_WEIGHT * park_signal * 100.0
        new_score = life_points + medical_points + park_points
        current = _current_amenity(adong)
        delta = new_score - current if current is not None else None

        rows.append(
            AmenityRow(
                code=adong.adong_code,
                slug=adong.slug,
                gu=adong.gu.name if adong.gu_id else "",
                name=adong.name,
                current_score=current,
                new_score=new_score,
                delta=delta,
                area_km2=area_km2,
                life_count=life_count,
                life_density=life_density,
                life_signal=life_signal,
                life_points=life_points,
                medical_count=medical_count,
                medical_density=medical_density,
                medical_signal=medical_signal,
                medical_points=medical_points,
                park_count=park_count,
                park_area_m2=park_area_m2,
                park_area_ratio=park_area_ratio,
                park_signal=park_signal,
                park_points=park_points,
            )
        )

    return rows, life_p95_log, medical_p95_log


def _format_score(value: float | None) -> str:
    return "NULL" if value is None else f"{value:6.2f}"


def _print_row(row: AmenityRow) -> None:
    delta = "NULL" if row.delta is None else f"{row.delta:+.2f}"
    print(
        f"{row.gu} {row.name} ({row.slug})\n"
        f"  current -> new: {_format_score(row.current_score)} -> {row.new_score:6.2f} "
        f"({delta})\n"
        f"  life: count={row.life_count}, density={row.life_density:.2f}/km2, "
        f"signal={row.life_signal * 100:.1f}%, points={row.life_points:.2f}\n"
        f"  medical: count={row.medical_count}, density={row.medical_density:.2f}/km2, "
        f"signal={row.medical_signal * 100:.1f}%, points={row.medical_points:.2f}\n"
        f"  park: count={row.park_count}, area={row.park_area_m2:.0f}m2, "
        f"ratio={row.park_area_ratio * 100:.1f}%, points={row.park_points:.2f}"
    )


def _print_summary(
    rows: list[AmenityRow],
    life_p95_log: float,
    medical_p95_log: float,
    limit: int,
) -> None:
    new_scores = [row.new_score for row in rows]
    current_scores = [row.current_score for row in rows if row.current_score is not None]
    deltas = [row.delta for row in rows if row.delta is not None]
    missing_current = sum(1 for row in rows if row.current_score is None)

    print("[INFO] amenity recompute dry-run")
    print(f"  adongs: {len(rows)}")
    print(f"  current_adong missing: {missing_current}")
    print(
        "  life p95 anchor: "
        f"log={life_p95_log:.6f}, density={math.expm1(life_p95_log):.2f}/km2"
    )
    print(
        "  medical p95 anchor: "
        f"log={medical_p95_log:.6f}, density={math.expm1(medical_p95_log):.2f}/km2"
    )
    if current_scores:
        print(
            "  current score: "
            f"min={min(current_scores):.2f}, "
            f"median={statistics.median(current_scores):.2f}, "
            f"mean={statistics.mean(current_scores):.2f}, "
            f"max={max(current_scores):.2f}"
        )
    print(
        "  new score:     "
        f"min={min(new_scores):.2f}, "
        f"median={statistics.median(new_scores):.2f}, "
        f"mean={statistics.mean(new_scores):.2f}, "
        f"max={max(new_scores):.2f}"
    )
    if deltas:
        print(
            "  delta:         "
            f"min={min(deltas):+.2f}, "
            f"median={statistics.median(deltas):+.2f}, "
            f"mean={statistics.mean(deltas):+.2f}, "
            f"max={max(deltas):+.2f}"
        )

    print(f"\n[INFO] largest absolute changes (top {limit})")
    changed = sorted(
        (row for row in rows if row.delta is not None),
        key=lambda row: abs(row.delta or 0.0),
        reverse=True,
    )[:limit]
    for row in changed:
        delta = row.delta if row.delta is not None else 0.0
        print(
            f"  {row.gu:5s} {row.name:12s} "
            f"{row.current_score:6.2f} -> {row.new_score:6.2f} ({delta:+6.2f}) "
            f"life={row.life_count:4d} med={row.medical_count:3d} "
            f"park_ratio={row.park_area_ratio * 100:6.1f}%"
        )


def _filter_rows(rows: Iterable[AmenityRow], slug: str | None) -> list[AmenityRow]:
    if not slug:
        return list(rows)
    return [row for row in rows if row.slug == slug or row.name == slug]


def _apply(rows: list[AmenityRow]) -> int:
    score_by_code = {row.code: row.new_score for row in rows}
    current_rows = list(CurrentAdong.objects.filter(adong_id__in=score_by_code.keys()))
    for current in current_rows:
        current.score_amenity = score_by_code[current.adong_id]

    with transaction.atomic():
        CurrentAdong.objects.bulk_update(current_rows, ["score_amenity"], batch_size=200)

    return len(current_rows)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Recompute current_adong.score_amenity from amenity source tables."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write new scores into current_adong. Default is dry-run only.",
    )
    parser.add_argument(
        "--slug",
        help="Only print/apply one adong by slug or name, e.g. 강북구-우이동.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Number of changed rows to show in dry-run summary.",
    )
    args = parser.parse_args()

    rows, life_p95_log, medical_p95_log = _build_rows()
    selected = _filter_rows(rows, args.slug)
    if args.slug and not selected:
        print(f"[ERROR] adong not found: {args.slug}", file=sys.stderr)
        return 1

    if args.slug:
        for row in selected:
            _print_row(row)
    else:
        _print_summary(selected, life_p95_log, medical_p95_log, args.limit)

    if not args.apply:
        print("\n[DRY-RUN] no rows updated. Re-run with --apply to write current_adong.")
        return 0

    updated = _apply(selected)
    print(f"\n[OK] updated current_adong.score_amenity rows: {updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
