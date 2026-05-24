"""Import rent_deal_ldong_adong_map from a two-column CSV.

CSV columns: ldong_code, adong_code. Blank adong_code means intentionally NULL.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from _django import setup

setup()

from django.db import transaction  # noqa: E402

from apps.public_data.rent_deal.models import RentDealLdongAdongMap  # noqa: E402
from apps.public_data.regions.models import Adong, Ldong  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", help="CSV with ldong_code,adong_code columns")
    args = parser.parse_args()

    path = Path(args.csv_path)
    if not path.exists():
        raise FileNotFoundError(path)

    valid_ldongs = set(Ldong.objects.values_list("ldong_code", flat=True))
    valid_adongs = set(Adong.objects.values_list("adong_code", flat=True))

    rows: list[RentDealLdongAdongMap] = []
    null_count = 0
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        expected = {"ldong_code", "adong_code"}
        if set(reader.fieldnames or []) != expected:
            raise ValueError(f"expected columns {sorted(expected)}, got {reader.fieldnames}")
        for line_no, row in enumerate(reader, start=2):
            ldong_code = (row["ldong_code"] or "").strip()
            adong_code = (row["adong_code"] or "").strip() or None
            if ldong_code not in valid_ldongs:
                raise ValueError(f"line {line_no}: unknown ldong_code {ldong_code}")
            if adong_code is not None and adong_code not in valid_adongs:
                raise ValueError(f"line {line_no}: unknown adong_code {adong_code}")
            if adong_code is None:
                null_count += 1
            rows.append(RentDealLdongAdongMap(ldong_id=ldong_code, adong_id=adong_code))

    with transaction.atomic():
        RentDealLdongAdongMap.objects.all().delete()
        RentDealLdongAdongMap.objects.bulk_create(rows, batch_size=500)

    print(
        f"imported={len(rows):,} mapped={len(rows) - null_count:,} null={null_count:,} "
        f"table=rent_deal_ldong_adong_map"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
