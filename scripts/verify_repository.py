from __future__ import annotations

import json
import sys
from pathlib import Path

from harmoness.verify import verify_manifest


def main() -> int:
    manifests = sorted(Path("generations").glob("**/manifest.json")) if Path("generations").exists() else []
    if not manifests:
        print("No committed generation manifests; repository witness scan is clean.")
        return 0

    failed = 0
    for manifest in manifests:
        receipt = verify_manifest(manifest)
        print(json.dumps(receipt, indent=2, sort_keys=True))
        if receipt["verdict"] != "PASS":
            failed += 1

    print(f"Verified {len(manifests)} generation manifest(s); failures={failed}.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
