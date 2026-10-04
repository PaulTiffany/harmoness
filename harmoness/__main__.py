from __future__ import annotations

import argparse
import json

from .verify import verify_manifest


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="harmoness",
        description="Deterministic witness checks for generative musical renders.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    verify = sub.add_parser("verify", help="verify one generation manifest")
    verify.add_argument("manifest")

    args = parser.parse_args()
    if args.command == "verify":
        receipt = verify_manifest(args.manifest)
        print(json.dumps(receipt, indent=2, sort_keys=True))
        return 0 if receipt["verdict"] == "PASS" else 1

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
