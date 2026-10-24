import math

import networkx as nx

from richter.gitstats import FileStats
from richter.risk import score
from richter.snapshots import sample_indices


def test_sample_indices_end_at_head_and_cap_to_history():
    assert sample_indices(100, 4) == [24, 49, 74, 99]
    assert sample_indices(3, 28) == [0, 1, 2]


def test_human_ref_keeps_history_comparable():
    g = nx.DiGraph([("a", "b")])
    early = {"a": FileStats(churn=2, fixes=0), "b": FileStats(churn=2, fixes=0)}
    # own-range normalization would stretch two quiet files to 0..1; against the
    # present-day maximum they stay quiet
    ref = math.log1p(50.0)
    r = score(g, early, human_ref=ref)
    assert all(x.human < 0.2 for x in r.values())
