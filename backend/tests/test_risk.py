import networkx as nx

from richter.gitstats import FileStats
from richter.risk import blast_radius, rank_normalize, score


def chain():
    # app -> routing -> util ; cli -> util   (A -> B means A imports B)
    g = nx.DiGraph()
    g.add_edges_from([("app", "routing"), ("routing", "util"), ("cli", "util")])
    return g


def test_blast_radius_is_transitive_reverse_reachability():
    g = chain()
    assert blast_radius(g, "util") == {"routing": 1, "cli": 1, "app": 2}
    assert blast_radius(g, "app") == {}


def test_rank_normalize_ties_take_lowest_rank():
    r = rank_normalize({"a": 0, "b": 0, "c": 5, "d": 9})
    assert r == {"a": 0.0, "b": 0.0, "c": 2 / 3, "d": 1.0}


def test_magnitude_needs_both_axes_but_keeps_gradient():
    g = chain()
    busy = FileStats(churn=40, fixes=20, authors={"x", "y"})
    quiet = FileStats(churn=1, fixes=0, authors={"x"})
    r = score(g, {"util": busy, "routing": quiet, "app": busy, "cli": quiet})
    assert r["util"].magnitude == max(x.magnitude for x in r.values())  # central AND reworked
    assert r["app"].magnitude > r["cli"].magnitude > 0                  # floor keeps gradient
    assert r["cli"].bus_factor and not r["util"].bus_factor
