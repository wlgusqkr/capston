"""Recompute current_adong.score_transit with centroid-based subway distance.

This keeps the current Adong + current_adong API surface intact and changes only
the score source value.  The subway component uses Adong.location instead of
the nearest distance from the whole Adong boundary, so large administrative
areas are not treated as perfect transit areas just because a station exists
somewhere inside the polygon.

Usage:
    python scripts/scoring/recompute_current_adong_transit.py
    python scripts/scoring/recompute_current_adong_transit.py --slug 강북구-우이동
    python scripts/scoring/recompute_current_adong_transit.py --apply
"""

from __future__ import annotations

import argparse
import math
import statistics
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _django import setup  # noqa: E402

setup()

from django.db import connection, transaction  # noqa: E402
from django.db.models import Count  # noqa: E402

from apps.public_data.bus.models import BusStop  # noqa: E402
from apps.public_data.regions.models import Adong  # noqa: E402
from apps.service.scoring.models import CurrentAdong  # noqa: E402


SUBWAY_WEIGHT = 0.60
BUS_WEIGHT = 0.40
SUBWAY_DISTANCE_CAP_M = 1000.0
BUS_DENSITY_PCTL = 0.95


@dataclass(frozen=True)
class NearestStation:
    name: str | None
    line: str | None
    distance_m: float | None


@dataclass(frozen=True)
class TransitRow:
    code: str
    slug: str
    gu: str
    name: str
    current_score: float | None
    new_score: float
    delta: float | None
    nearest_station: str | None
    nearest_line: str | None
    nearest_distance_m: float | None
    subway_signal: float
    subway_points: float
    bus_stop_count: int
    area_km2: float
    bus_density: float
    bus_signal: float
    bus_points: float


def _continuous_percentile(values: list[float], percentile: float) -> float:
    """Return a percentile using the same continuous interpolation as dry-run analysis."""

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


def _nearest_station_by_adong() -> dict[str, NearestStation]:
    """Nearest station from Adong.location, not from Adong.boundary."""

    sql = """
        SELECT
            a.adong_code,
            nearest.name,
            nearest.line,
            nearest.distance_m
        FROM adong a
        LEFT JOIN LATERAL (
            SELECT
                s.name,
                s.line,
                ST_Distance(a.location::geography, s.location::geography) AS distance_m
            FROM subway_station s
            WHERE a.location IS NOT NULL
              AND s.location IS NOT NULL
            ORDER BY a.location <-> s.location
            LIMIT 1
        ) nearest ON TRUE
    """
    with connection.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    return {
        code: NearestStation(
            name=name,
            line=line,
            distance_m=float(distance_m) if distance_m is not None else None,
        )
        for code, name, line, distance_m in rows
    }


def _bus_counts_by_adong() -> dict[str, int]:
    return dict(
        BusStop.objects.filter(adong__isnull=False)
        .values("adong_id")
        .annotate(n=Count("id"))
        .values_list("adong_id", "n")
    )


def _build_rows() -> tuple[list[TransitRow], float]:
    adongs = list(Adong.objects.select_related("gu", "current_score").order_by("adong_code"))
    nearest_by_code = _nearest_station_by_adong()
    bus_counts = _bus_counts_by_adong()

    bus_logs: list[float] = []
    bus_density_by_code: dict[str, float] = {}
    area_by_code: dict[str, float] = {}
    for adong in adongs:
        area_km2 = float(adong.area_m2 or 0.0) / 1_000_000.0
        bus_count = bus_counts.get(adong.adong_code, 0)
        bus_density = bus_count / area_km2 if area_km2 > 0 else 0.0
        area_by_code[adong.adong_code] = area_km2
        bus_density_by_code[adong.adong_code] = bus_density
        bus_logs.append(math.log1p(bus_density))

    bus_p95_log = _continuous_percentile(bus_logs, BUS_DENSITY_PCTL)

    rows: list[TransitRow] = []
    for adong in adongs:
        nearest = nearest_by_code.get(adong.adong_code, NearestStation(None, None, None))
        distance_m = nearest.distance_m
        distance_for_score = (
            distance_m if distance_m is not None else SUBWAY_DISTANCE_CAP_M
        )
        subway_signal = max(0.0, 1.0 - distance_for_score / SUBWAY_DISTANCE_CAP_M)

        area_km2 = area_by_code[adong.adong_code]
        bus_count = bus_counts.get(adong.adong_code, 0)
        bus_density = bus_density_by_code[adong.adong_code]
        bus_log = math.log1p(bus_density)
        bus_signal = min(1.0, bus_log / bus_p95_log) if bus_p95_log > 0 else 0.0

        new_score = (SUBWAY_WEIGHT * subway_signal + BUS_WEIGHT * bus_signal) * 100.0
        current = _current_transit(adong)
        delta = new_score - current if current is not None else None
        rows.append(
            TransitRow(
                code=adong.adong_code,
                slug=adong.slug,
                gu=adong.gu.name if adong.gu_id else "",
                name=adong.name,
                current_score=current,
                new_score=new_score,
                delta=delta,
                nearest_station=nearest.name,
                nearest_line=nearest.line,
                nearest_distance_m=distance_m,
                subway_signal=subway_signal,
                subway_points=SUBWAY_WEIGHT * subway_signal * 100.0,
                bus_stop_count=bus_count,
                area_km2=area_km2,
                bus_density=bus_density,
                bus_signal=bus_signal,
                bus_points=BUS_WEIGHT * bus_signal * 100.0,
            )
        )

    return rows, bus_p95_log


def _current_transit(adong: Adong) -> float | None:
    try:
        value = adong.current_score.score_transit
    except CurrentAdong.DoesNotExist:
        return None
    return float(value) if value is not None else None


def _format_score(value: float | None) -> str:
    return "NULL" if value is None else f"{value:6.2f}"


def _print_row(row: TransitRow) -> None:
    distance = "NULL" if row.nearest_distance_m is None else f"{row.nearest_distance_m:.1f}m"
    delta = "NULL" if row.delta is None else f"{row.delta:+.2f}"
    print(
        f"{row.gu} {row.name} ({row.slug})\n"
        f"  current -> new: {_format_score(row.current_score)} -> {row.new_score:6.2f} "
        f"({delta})\n"
        f"  subway: {row.nearest_station or 'NULL'}"
        f"{f'/{row.nearest_line}' if row.nearest_line else ''}, "
        f"distance={distance}, signal={row.subway_signal * 100:.1f}%, "
        f"points={row.subway_points:.2f}\n"
        f"  bus: stops={row.bus_stop_count}, area={row.area_km2:.3f}km2, "
        f"density={row.bus_density:.2f}/km2, signal={row.bus_signal * 100:.1f}%, "
        f"points={row.bus_points:.2f}"
    )


def _print_summary(rows: list[TransitRow], bus_p95_log: float, limit: int) -> None:
    new_scores = [r.new_score for r in rows]
    current_scores = [r.current_score for r in rows if r.current_score is not None]
    deltas = [r.delta for r in rows if r.delta is not None]
    missing_current = sum(1 for r in rows if r.current_score is None)

    print("[INFO] transit recompute dry-run")
    print(f"  adongs: {len(rows)}")
    print(f"  current_adong missing: {missing_current}")
    print(
        "  bus p95 anchor: "
        f"log={bus_p95_log:.6f}, density={math.expm1(bus_p95_log):.2f}/km2"
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
        (r for r in rows if r.delta is not None),
        key=lambda r: abs(r.delta or 0.0),
        reverse=True,
    )[:limit]
    for row in changed:
        delta = row.delta if row.delta is not None else 0.0
        print(
            f"  {row.gu:5s} {row.name:12s} "
            f"{row.current_score:6.2f} -> {row.new_score:6.2f} ({delta:+6.2f}) "
            f"dist={row.nearest_distance_m or 0.0:7.1f}m "
            f"bus={row.bus_stop_count:3d} density={row.bus_density:6.2f}/km2"
        )


def _filter_rows(rows: Iterable[TransitRow], slug: str | None) -> list[TransitRow]:
    if not slug:
        return list(rows)
    return [row for row in rows if row.slug == slug or row.name == slug]


def _apply(rows: list[TransitRow]) -> int:
    score_by_code = {row.code: row.new_score for row in rows}
    current_rows = list(CurrentAdong.objects.filter(adong_id__in=score_by_code.keys()))
    for current in current_rows:
        current.score_transit = score_by_code[current.adong_id]

    with transaction.atomic():
        CurrentAdong.objects.bulk_update(current_rows, ["score_transit"], batch_size=200)

    return len(current_rows)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Recompute current_adong.score_transit using Adong.location."
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

    rows, bus_p95_log = _build_rows()
    selected = _filter_rows(rows, args.slug)
    if args.slug and not selected:
        print(f"[ERROR] adong not found: {args.slug}", file=sys.stderr)
        return 1

    if args.slug:
        for row in selected:
            _print_row(row)
    else:
        _print_summary(selected, bus_p95_log, args.limit)

    if not args.apply:
        print("\n[DRY-RUN] no rows updated. Re-run with --apply to write current_adong.")
        return 0

    updated = _apply(selected)
    print(f"\n[OK] updated current_adong.score_transit rows: {updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
