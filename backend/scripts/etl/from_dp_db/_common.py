"""[TEMP] DP_DB -> SLGI 임시 ETL 공통 헬퍼.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

설계 원칙
- DSN은 환경변수만 사용 (하드코딩 password 0).
  - DP_DB_DSN : DP_DB 로컬 docker (단계 5 docker network 결정 시 호스트명 갱신)
  - SLGI_DSN  : SLGI docker container
- 모든 스크립트는 멱등 (ON CONFLICT DO UPDATE/NOTHING).
- Geometry는 DP_DB에서 ST_AsEWKT로 read, SLGI에는 ST_GeomFromEWKT로 write.
- 큰 테이블은 server-side cursor (itersize) + execute_batch 패턴.

사용 예
    # 셸 환경에 DP_DB_DSN, SLGI_DSN 등록 후
    python 01_seoul.py
"""

from __future__ import annotations

import os
import sys
import time
from contextlib import contextmanager
from typing import Iterator

import psycopg2
from psycopg2.extras import execute_batch


# ---------------------------------------------------------------------------
# DSN 해석 -- 환경변수만 사용. 하드코딩 default 없음.
# ---------------------------------------------------------------------------


def get_dp_db_dsn() -> str:
    """DP_DB 로컬 docker DSN. env DP_DB_DSN."""
    v = os.environ.get("DP_DB_DSN")
    if not v:
        raise RuntimeError(
            "DP_DB_DSN 환경변수가 설정되지 않았습니다. "
            "DP_DB 로컬 docker DSN을 DP_DB_DSN으로 등록하세요."
        )
    return v


def get_slgi_dsn() -> str:
    """SLGI docker container DSN. env SLGI_DSN."""
    v = os.environ.get("SLGI_DSN")
    if not v:
        raise RuntimeError(
            "SLGI_DSN 환경변수가 설정되지 않았습니다. "
            "SLGI docker container DSN을 SLGI_DSN으로 등록하세요."
        )
    return v


@contextmanager
def connect_dp_db() -> Iterator[psycopg2.extensions.connection]:
    conn = psycopg2.connect(get_dp_db_dsn())
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def connect_slgi() -> Iterator[psycopg2.extensions.connection]:
    conn = psycopg2.connect(get_slgi_dsn())
    try:
        yield conn
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 배치 INSERT 헬퍼
# ---------------------------------------------------------------------------


def batch_insert(
    slgi_conn: psycopg2.extensions.connection,
    sql: str,
    rows: list[tuple],
    batch_size: int = 1000,
) -> int:
    """execute_batch로 일괄 INSERT. 호출자가 connection을 제공."""
    if not rows:
        return 0
    with slgi_conn.cursor() as cur:
        execute_batch(cur, sql, rows, page_size=batch_size)
    slgi_conn.commit()
    return len(rows)


def stream_and_insert(
    src_conn: psycopg2.extensions.connection,
    dst_conn: psycopg2.extensions.connection,
    select_sql: str,
    insert_sql: str,
    transform=None,
    fetch_size: int = 10000,
    batch_size: int = 10000,
    label: str = "",
) -> int:
    """대용량 테이블용 server-side cursor 스트리밍 + execute_batch INSERT.

    transform: row -> tuple 변환 함수. None이면 row 그대로.
    """
    inserted = 0
    start = time.monotonic()
    with src_conn.cursor(name=f"stream_{label or 'cur'}") as scur:
        scur.itersize = fetch_size
        scur.execute(select_sql)
        with dst_conn.cursor() as dcur:
            while True:
                batch = scur.fetchmany(fetch_size)
                if not batch:
                    break
                if transform is not None:
                    coerced = [transform(r) for r in batch]
                    coerced = [r for r in coerced if r is not None]
                else:
                    coerced = list(batch)
                if coerced:
                    execute_batch(dcur, insert_sql, coerced, page_size=batch_size)
                    inserted += len(coerced)
                    dst_conn.commit()
                elapsed = time.monotonic() - start
                rps = inserted / elapsed if elapsed > 0 else 0
                sys.stdout.write(
                    f"\r[{label}] inserted {inserted:,} rows  ({rps:,.0f} rps)"
                )
                sys.stdout.flush()
    sys.stdout.write("\n")
    return inserted


# ---------------------------------------------------------------------------
# 검증 (DP_DB vs SLGI row count)
# ---------------------------------------------------------------------------


def verify_count(
    dp_conn: psycopg2.extensions.connection,
    slgi_conn: psycopg2.extensions.connection,
    table: str,
    *,
    dp_table: str | None = None,
    where: str = "",
) -> tuple[int, int]:
    dp_table = dp_table or table
    where_sql = f" WHERE {where}" if where else ""
    with dp_conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {dp_table}{where_sql}")
        r = cur.fetchone()[0]
    with slgi_conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table}{where_sql}")
        s = cur.fetchone()[0]
    print(f"[verify] {table}: DP_DB={r:,}  SLGI={s:,}  diff={s - r:+,}")
    return r, s
