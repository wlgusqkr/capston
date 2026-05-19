"""ETL 공통 헬퍼 — RDS(dp_db) → local slgi.

설계 원칙
- DSN은 환경변수 DSN_RDS / DSN_LOCAL_DP_DB 또는 CLI 인자(--rds-dsn / --local-dsn)로 주입.
  레거시 호환을 위해 RDS_DSN / LOCAL_DSN 환경변수도 fallback으로 인정.
  default 하드코딩 DSN(password 포함)은 보안상 제거됨.
- 모든 스크립트는 멱등 (ON CONFLICT DO UPDATE/NOTHING).
- 큰 테이블은 fetchmany 배치 + COPY FROM stdin (psycopg3 stream API).
- Geometry는 RDS에서 ST_AsEWKT로 read, local에는 ST_GeomFromEWKT로 write.
  (PG18 ↔ PG16 EWKB binary가 호환되므로 ST_AsBinary로도 가능하지만
   디버깅 편의상 EWKT 사용. 양은 1회 ETL 수준이라 성능 차이 무시 가능.)
- argparse는 표준 (--limit 옵션은 개발/샘플 실행용).

사용 예
    # .env 또는 셸 환경에 DSN_RDS, DSN_LOCAL_DP_DB 등록 후
    python 01_seoul.py
    python 17_rent_deal.py --limit 10000   # 1만 row만 적재 (샘플 검증)
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from contextlib import contextmanager
from typing import Iterator

import psycopg


# ---------------------------------------------------------------------------
# DSN 해석 — 환경변수만 사용. 하드코딩 default 없음.
# ---------------------------------------------------------------------------


def _resolve_dsn(*env_names: str) -> str | None:
    """주어진 환경변수 이름들을 순서대로 확인, 첫 비어있지 않은 값을 반환."""
    for name in env_names:
        v = os.environ.get(name)
        if v:
            return v
    return None


# ---------------------------------------------------------------------------
# CLI / DSN
# ---------------------------------------------------------------------------


def make_argparser(description: str) -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=description)
    p.add_argument(
        "--rds-dsn",
        default=_resolve_dsn("DSN_RDS", "RDS_DSN"),
        help="RDS DSN (default: env DSN_RDS, fallback RDS_DSN). 미지정 시 connect()에서 오류.",
    )
    p.add_argument(
        "--local-dsn",
        default=_resolve_dsn("DSN_LOCAL_DP_DB", "LOCAL_DSN"),
        help="Local DSN (default: env DSN_LOCAL_DP_DB, fallback LOCAL_DSN). 미지정 시 connect()에서 오류.",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=None,
        help="개발용: RDS에서 가져올 row 상한 (None = 전체).",
    )
    p.add_argument(
        "--batch-size",
        type=int,
        default=10000,
        help="배치 크기 (default 10000).",
    )
    return p


@contextmanager
def connect(dsn: str | None, *, autocommit: bool = False) -> Iterator[psycopg.Connection]:
    if not dsn:
        raise RuntimeError(
            "DSN이 설정되지 않았습니다. 환경변수 DSN_RDS / DSN_LOCAL_DP_DB "
            "(레거시: RDS_DSN / LOCAL_DSN)를 설정하거나 --rds-dsn/--local-dsn 인자를 사용하세요."
        )
    conn = psycopg.connect(dsn, autocommit=autocommit)
    try:
        yield conn
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 진행률 로깅
# ---------------------------------------------------------------------------


class Progress:
    """간단한 진행률 출력 (tqdm 없이도 동작).

    매 step row마다 같은 줄에 진행률/ETA/RPS 출력. 100k 단위 큰 테이블에 충분.
    """

    def __init__(self, total: int, label: str, step: int = 10_000):
        self.total = max(total, 1)
        self.label = label
        self.step = step
        self.done = 0
        self.start = time.monotonic()
        self._last_report = 0

    def add(self, n: int) -> None:
        self.done += n
        if self.done - self._last_report >= self.step or self.done >= self.total:
            self._report()
            self._last_report = self.done

    def _report(self) -> None:
        elapsed = max(time.monotonic() - self.start, 0.001)
        rps = self.done / elapsed
        pct = self.done / self.total * 100
        eta = (self.total - self.done) / rps if rps > 0 else 0
        sys.stdout.write(
            f"\r[{self.label}] {self.done:>10,}/{self.total:<10,} "
            f"({pct:5.1f}%)  {rps:>8,.0f} rps  eta {eta:>5.0f}s"
        )
        sys.stdout.flush()

    def finish(self) -> None:
        self._report()
        elapsed = time.monotonic() - self.start
        sys.stdout.write(
            f"\n[{self.label}] done in {elapsed:.1f}s ({self.done:,} rows)\n"
        )
        sys.stdout.flush()


# ---------------------------------------------------------------------------
# 멱등 INSERT 헬퍼 (작은 테이블용)
# ---------------------------------------------------------------------------


def upsert_many(
    cur: psycopg.Cursor,
    table: str,
    columns: list[str],
    rows: list[tuple],
    *,
    conflict_cols: list[str],
    update_cols: list[str] | None = None,
) -> tuple[int, int]:
    """
    소규모 멱등 INSERT. update_cols 가 None이면 DO NOTHING.

    Returns (affected_count, len(rows))
    """
    if not rows:
        return 0, 0

    col_list = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    conflict_list = ", ".join(conflict_cols)

    if update_cols:
        set_clause = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)
        sql = (
            f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) "
            f"ON CONFLICT ({conflict_list}) DO UPDATE SET {set_clause}"
        )
    else:
        sql = (
            f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) "
            f"ON CONFLICT ({conflict_list}) DO NOTHING"
        )

    cur.executemany(sql, rows)
    return cur.rowcount, len(rows)


# ---------------------------------------------------------------------------
# 검증 (RDS vs local row count)
# ---------------------------------------------------------------------------


def verify_count(
    rds: psycopg.Connection,
    local: psycopg.Connection,
    table: str,
    *,
    rds_table: str | None = None,
    where: str = "",
) -> tuple[int, int]:
    rds_table = rds_table or table
    where_sql = f" WHERE {where}" if where else ""
    with rds.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {rds_table}{where_sql}")
        r = cur.fetchone()[0]
    with local.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table}{where_sql}")
        l = cur.fetchone()[0]
    print(f"[verify] {table}: RDS={r:,}  LOCAL={l:,}  diff={l-r:+,}")
    return r, l


# ---------------------------------------------------------------------------
# 배치 fetcher
# ---------------------------------------------------------------------------


def fetch_in_batches(
    cur: psycopg.Cursor, batch_size: int = 10_000
) -> Iterator[list[tuple]]:
    while True:
        rows = cur.fetchmany(batch_size)
        if not rows:
            return
        yield rows
