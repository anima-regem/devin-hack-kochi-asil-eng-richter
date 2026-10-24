"""Backtest: does magnitude at time T predict where fixes land AFTER T?

Take the snapshot frame nearest a cutoff (default 60% of history), rank the files
alive at that moment by magnitude, and measure what share of all later fix-commit
touches (on those same files) hit the top 10%. Compare against random (10%) and
a churn-only ranking, which is the obvious naive baseline.
"""

from __future__ import annotations

import json
import math

from . import gitstats
from .ingest import clone, read_log, repo_slug
from .pipeline import MODELS_DIR
from .snapshots import SNAPSHOTS_DIR


def backtest(url: str, cutoff: float = 0.6, top: float = 0.1) -> dict:
    slug = repo_slug(url)
    model = json.loads((MODELS_DIR / f"{slug}.json").read_text())
    snap = json.loads((SNAPSHOTS_DIR / f"{slug}.json").read_text())
    commits = read_log(clone(url))
    index = {n["id"]: i for i, n in enumerate(model["nodes"])}

    target = cutoff * len(commits)
    frame = min(snap["frames"], key=lambda f: abs(f["commits"] - target))
    k = frame["commits"]  # commits[:k] is the past, commits[k:] the future
    alive = [i for i, m in enumerate(frame["magnitude"]) if m is not None]

    # replay history once: churn up to the cutoff, fix touches after it,
    # keyed by stable file id and mapped to today's paths at the end
    identity = gitstats.FileIdentity()
    churn_before: dict[int, int] = {}
    fixes_after: dict[int, int] = {}
    for n, c in enumerate(commits):
        fix = gitstats.is_fix(c.message)
        for ch in c.changes:
            fid = identity.apply(ch)
            if fid is None:
                continue
            if n < k:
                churn_before[fid] = churn_before.get(fid, 0) + 1
            elif fix:
                fixes_after[fid] = fixes_after.get(fid, 0) + 1
    today_idx = {fid: index[p] for p, fid in identity.ids.items() if p in index}
    future = {i: 0 for i in alive}
    churn = {i: 0 for i in alive}
    for fid, i in today_idx.items():
        if i in future:
            future[i] = fixes_after.get(fid, 0)
            churn[i] = churn_before.get(fid, 0)

    total = sum(future.values())
    n_top = max(1, math.ceil(len(alive) * top))

    def share(ranked: list[int]) -> float:
        return sum(future[i] for i in ranked[:n_top]) / total if total else 0.0

    by_mag = sorted(alive, key=lambda i: -frame["magnitude"][i])
    by_churn = sorted(alive, key=lambda i: -churn[i])
    return {
        "repo": model["repo"]["name"],
        "cutoff_commit": k,
        "commits": len(commits),
        "files_at_cutoff": len(alive),
        "top_n": n_top,
        "future_fix_touches": total,
        "magnitude_share": round(share(by_mag), 3),
        "churn_share": round(share(by_churn), 3),
        "random_share": round(n_top / len(alive), 3),
    }
