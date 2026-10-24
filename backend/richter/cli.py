"""Command line: `python -m richter.cli analyze <github-url> [--include-tests]`."""

from __future__ import annotations

import argparse
import time

from .pipeline import analyze


def main() -> None:
    ap = argparse.ArgumentParser(prog="richter")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("analyze", help="clone a repo and write data/models/<slug>.json")
    a.add_argument("url")
    a.add_argument("--include-tests", action="store_true",
                   help="also parse tests/, docs_src/, docs/, examples/")
    args = ap.parse_args()

    t0 = time.time()
    m = analyze(args.url, include_tests=args.include_tests)
    top = sorted(m["nodes"], key=lambda n: -n["magnitude"])[:5]
    print(f"{m['repo']['name']}: {m['summary']} in {time.time() - t0:.1f}s")
    for n in top:
        print(f"  M{n['magnitude'] * 10:4.1f}  blast={n['blast_size']:<4d} {n['id']}")


if __name__ == "__main__":
    main()
