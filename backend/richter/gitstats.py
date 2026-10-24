"""Stage 2b — GIT PARSER.

Per file: churn (commits touching it), distinct authors, fix commits, smoothed
fix ratio, and co-change pairs (files repeatedly committed together).

File identity follows renames, so `fastapi/old_name.py` -> `fastapi/new_name.py`
keeps one continuous history. Stats are reported under each file's path at the
END of the given commit list, which lets time-travel snapshots reuse this module
on a prefix of history.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from itertools import combinations

from .ingest import Commit

FIX_RE = re.compile(r"\b(fix(e[sd])?|bug(s|fix)?|revert(s|ed)?|hotfix|regression|crash(es)?|broken)\b", re.I)

# Co-change de-noising: mass commits (reformat, license headers, renames) link
# everything to everything, so they are skipped; a pair needs repeated, consistent
# evidence before it counts.
MAX_FILES_PER_COMMIT = 30
MIN_SHARED_COMMITS = 3
MIN_CONFIDENCE = 0.5


@dataclass
class FileStats:
    churn: int = 0
    fixes: int = 0
    authors: set[str] = field(default_factory=set)
    first_ts: int = 0
    last_ts: int = 0

    @property
    def fix_ratio(self) -> float:
        # Smoothed share of commits that were fixes: a file with 1 commit that
        # happened to be a fix scores 2/6 = 0.33, not 100%.
        return (self.fixes + 1) / (self.churn + 5)

    @property
    def human_risk(self) -> float:
        # churn × smoothed fix ratio ≈ a smoothed count of fix commits. It is high
        # only when a file is BOTH busy and repeatedly reworked — our proxy for
        # "development keeps getting stuck here".
        return self.churn * self.fix_ratio


@dataclass
class CoChange:
    a: str
    b: str
    shared: int
    confidence: float  # shared / min(churn_a, churn_b)


def is_fix(message: str) -> bool:
    return bool(FIX_RE.search(message))


def compute(commits: list[Commit], keep: set[str] | None = None
            ) -> tuple[dict[str, FileStats], list[CoChange]]:
    """Stats for files alive after `commits` (oldest first). `keep` filters paths."""
    ident: dict[str, int] = {}          # current path -> stable file id
    next_id = 0
    stats: dict[int, FileStats] = defaultdict(FileStats)
    pair_counts: Counter[tuple[int, int]] = Counter()

    for c in commits:
        touched: set[int] = set()
        for ch in c.changes:
            if ch.status == "R" and ch.old_path is not None:
                fid = ident.pop(ch.old_path, None)
                if fid is None:
                    fid, next_id = next_id, next_id + 1
                ident[ch.path] = fid
            elif ch.status == "D":
                fid = ident.pop(ch.path, None)
                if fid is None:
                    continue
            else:
                fid = ident.get(ch.path)
                if fid is None:
                    fid, next_id = next_id, next_id + 1
                    ident[ch.path] = fid
            touched.add(fid)

        fix = is_fix(c.message)
        for fid in touched:
            s = stats[fid]
            s.churn += 1
            s.fixes += fix
            s.authors.add(c.author_email)
            s.first_ts = s.first_ts or c.timestamp
            s.last_ts = c.timestamp

        if 2 <= len(c.changes) <= MAX_FILES_PER_COMMIT:
            for a, b in combinations(sorted(touched), 2):
                pair_counts[(a, b)] += 1

    path_of = {fid: p for p, fid in ident.items() if keep is None or p in keep}
    out = {path_of[fid]: stats[fid] for fid in path_of if fid in stats}

    cochange = []
    for (a, b), shared in pair_counts.items():
        if shared < MIN_SHARED_COMMITS or a not in path_of or b not in path_of:
            continue
        conf = shared / min(stats[a].churn, stats[b].churn)
        if conf >= MIN_CONFIDENCE:
            cochange.append(CoChange(path_of[a], path_of[b], shared, round(conf, 3)))
    cochange.sort(key=lambda x: -x.shared)
    return out, cochange


if __name__ == "__main__":
    import sys
    from pathlib import Path

    from .deps import build_import_graph
    from .ingest import read_log

    root = Path(sys.argv[1])
    g = build_import_graph(root)
    st, cc = compute(read_log(root), keep=set(g.nodes))
    print(f"{len(st)}/{g.number_of_nodes()} files with history, {len(cc)} co-change pairs")
    print("top churn:")
    for p, s in sorted(st.items(), key=lambda kv: -kv[1].churn)[:6]:
        print(f"  {s.churn:4d} commits {len(s.authors):3d} authors {s.fixes:3d} fixes  "
              f"ratio={s.fix_ratio:.2f} human={s.human_risk:5.1f}  {p}")
    ghosts = [c for c in cc if not (g.has_edge(c.a, c.b) or g.has_edge(c.b, c.a))]
    print(f"ghost edges (co-change, no import): {len(ghosts)}")
    for c in ghosts[:6]:
        print(f"  {c.shared:3d}x conf={c.confidence:.2f}  {c.a}  <->  {c.b}")
    print(f"bus factor 1: {sum(len(s.authors) == 1 for s in st.values())} files")
