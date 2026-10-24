"""Stage 3 — RISK ENGINE (the core).

Pure functions from (import graph, git stats) to per-file risk metrics. No I/O.

  importance   = PageRank on the import graph (imported-by-important => important)
  blast_radius = reverse-import reachability: every file that depends on this one,
                 directly or transitively ("who breaks if I change this")
  structural   = 0.5·rank(PageRank) + 0.5·rank(blast_radius_size)
  human        = log-scaled, min-max normalized human_risk (churn × smoothed fix ratio)
  magnitude    = sqrt(max(structural, FLOOR) · max(human, FLOOR))  — geometric mean

The geometric mean still demands "fragile AND reworked" to be hot, but the floor
keeps a visible gradient instead of zeroing every file that is weak on one axis.

SCORING IS FROZEN at SCORING_VERSION. Snapshots embed it; bump it on any change.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass

import networkx as nx

from .gitstats import FileStats

SCORING_VERSION = "1.0"
FLOOR = 0.05


@dataclass
class FileRisk:
    path: str
    pagerank: float
    importance: float          # rank-normalized PageRank, 0..1
    blast: dict[str, int]      # dependent file -> hop distance
    structural: float
    human: float
    magnitude: float
    bus_factor: bool


def rank_normalize(values: dict[str, float]) -> dict[str, float]:
    """Percentile rank in [0, 1]. Ties share the LOWEST rank, so a mass of zeros stays 0."""
    if len(values) < 2:
        return {k: 0.0 for k in values}
    ordered = sorted(values.values())
    first_index: dict[float, int] = {}
    for i, v in enumerate(ordered):
        first_index.setdefault(v, i)
    n = len(ordered) - 1
    return {k: first_index[v] / n for k, v in values.items()}


def log_minmax(values: dict[str, float]) -> dict[str, float]:
    logged = {k: math.log1p(v) for k, v in values.items()}
    lo, hi = min(logged.values(), default=0), max(logged.values(), default=0)
    span = hi - lo or 1.0
    return {k: (v - lo) / span for k, v in logged.items()}


def blast_radius(g: nx.DiGraph, node: str) -> dict[str, int]:
    """BFS over reversed import edges: {dependent: hops}. Hop count drives the cascade."""
    dist: dict[str, int] = {}
    queue = deque([(node, 0)])
    while queue:
        cur, d = queue.popleft()
        for dep in g.predecessors(cur):
            if dep != node and dep not in dist:
                dist[dep] = d + 1
                queue.append((dep, d + 1))
    return dist


def score(g: nx.DiGraph, stats: dict[str, FileStats],
          human_ref: float | None = None) -> dict[str, FileRisk]:
    """`human_ref` (snapshots only): normalize human risk as log1p(x)/human_ref against
    the present-day maximum instead of this graph's own range, so a time-lapse shows
    rework accumulating rather than every era looking equally hot."""
    if g.number_of_nodes() == 0:
        return {}
    pr = nx.pagerank(g) if g.number_of_edges() else {n: 1 / len(g) for n in g}
    blasts = {n: blast_radius(g, n) for n in g}

    importance = rank_normalize(pr)
    blast_rank = rank_normalize({n: len(b) for n, b in blasts.items()})
    human_raw = {n: stats[n].human_risk if n in stats else 0.0 for n in g}
    if human_ref:
        human = {k: min(1.0, math.log1p(v) / human_ref) for k, v in human_raw.items()}
    else:
        human = log_minmax(human_raw)

    out = {}
    for n in g:
        structural = 0.5 * importance[n] + 0.5 * blast_rank[n]
        magnitude = math.sqrt(max(structural, FLOOR) * max(human[n], FLOOR))
        s = stats.get(n)
        out[n] = FileRisk(
            path=n,
            pagerank=pr[n],
            importance=importance[n],
            blast=blasts[n],
            structural=structural,
            human=human[n],
            magnitude=magnitude,
            bus_factor=bool(s and len(s.authors) == 1),
        )
    return out
