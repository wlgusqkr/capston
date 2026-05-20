"""[TEMP] DP_DB amenity + amenity_adong + amenity_ldong -> SLGI 임시 ETL.

단계 6에서 1회 실행. 추후 실 초기 적재 ETL(별도 plan)로 대체 필요.

매핑:
- amenity (id bigserial PK, ~553k 행) — uq_amenity_source (source_table, source_id)
- amenity_adong (amenity_id, adong_code) [pk]
- amenity_ldong (amenity_id, ldong_code) [pk]
의존성: adong (04), ldong (03).

주의: amenity.id 는 bigserial. DP_DB 원본 id를 그대로 유지하려면 INSERT 시 id 명시.
이후 FK 무결성을 위해 sequence를 max(id)+1로 setval.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import connect_dp_db, connect_slgi, stream_and_insert, verify_count


SELECT_AMENITY = """
SELECT id, category, name, ST_AsEWKT(location), source_table, source_id
FROM amenity
ORDER BY id
"""

INSERT_AMENITY = """
INSERT INTO amenity (id, category, name, location, source_table, source_id)
VALUES (%s, %s, %s, ST_GeomFromEWKT(%s), %s, %s)
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    source_table = EXCLUDED.source_table,
    source_id = EXCLUDED.source_id
"""

SELECT_AA = "SELECT amenity_id, adong_code FROM amenity_adong"
INSERT_AA = """
INSERT INTO amenity_adong (amenity_id, adong_code)
VALUES (%s, %s)
ON CONFLICT (amenity_id, adong_code) DO NOTHING
"""

SELECT_AL = "SELECT amenity_id, ldong_code FROM amenity_ldong"
INSERT_AL = """
INSERT INTO amenity_ldong (amenity_id, ldong_code)
VALUES (%s, %s)
ON CONFLICT (amenity_id, ldong_code) DO NOTHING
"""

SETVAL_SQL = """
SELECT setval(
    pg_get_serial_sequence('amenity', 'id'),
    COALESCE((SELECT MAX(id) FROM amenity), 1),
    true
)
"""


def main() -> int:
    with connect_dp_db() as src, connect_slgi() as dst:
        # amenity 본체 — bigserial id 유지 위해 stream + id 명시
        n = stream_and_insert(
            src, dst, SELECT_AMENITY, INSERT_AMENITY,
            fetch_size=10000, batch_size=5000, label="amenity",
        )
        print(f"[18_amenity] amenity inserted/upserted {n} rows")

        # sequence 동기화 (이후 신규 INSERT가 PK 충돌 안 나도록)
        with dst.cursor() as cur:
            cur.execute(SETVAL_SQL)
            new_seq = cur.fetchone()[0]
            print(f"[18_amenity] amenity_id_seq setval -> {new_seq}")
        dst.commit()

        verify_count(src, dst, "amenity")

        # amenity_adong / amenity_ldong (N:M, 대용량 가능)
        n = stream_and_insert(
            src, dst, SELECT_AA, INSERT_AA,
            fetch_size=10000, batch_size=5000, label="amenity_adong",
        )
        print(f"[18_amenity] amenity_adong inserted {n} rows")
        verify_count(src, dst, "amenity_adong")

        n = stream_and_insert(
            src, dst, SELECT_AL, INSERT_AL,
            fetch_size=10000, batch_size=5000, label="amenity_ldong",
        )
        print(f"[18_amenity] amenity_ldong inserted {n} rows")
        verify_count(src, dst, "amenity_ldong")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
