from richter.gitstats import MAX_FILES_PER_COMMIT, compute, is_fix
from richter.ingest import Commit, FileChange


def commit(i, author, msg, *changes):
    return Commit(f"c{i}", author, author, 1000 + i, msg, list(changes))


def M(p):
    return FileChange("M", p)


def test_fix_detection():
    assert is_fix("Fix crash on empty body")
    assert is_fix("Revert 'add cache'")
    assert not is_fix("Add prefix option")  # 'prefix' must not match 'fix'


def test_renames_keep_history_and_smoothed_ratio():
    log = [
        commit(1, "a", "add", FileChange("A", "old.py")),
        commit(2, "b", "fix bug", M("old.py")),
        commit(3, "a", "rename", FileChange("R", "new.py", "old.py")),
    ]
    stats, _ = compute(log)
    assert set(stats) == {"new.py"}
    s = stats["new.py"]
    assert (s.churn, s.fixes, len(s.authors)) == (3, 1, 2)
    assert s.fix_ratio == (1 + 1) / (3 + 5)


def test_cochange_thresholds_and_mass_commit_skip():
    log = [commit(i, "a", "work", M("x.py"), M("y.py")) for i in range(3)]
    log.append(commit(9, "a", "touch z", M("z.py"), M("x.py")))
    mass = [M(f"f{i}.py") for i in range(MAX_FILES_PER_COMMIT + 1)]
    log += [commit(10 + i, "a", "reformat", M("z.py"), M("w.py"), *mass) for i in range(5)]
    _, cc = compute(log)
    pairs = {(c.a, c.b) if c.a < c.b else (c.b, c.a) for c in cc}
    assert ("x.py", "y.py") in pairs           # 3 shared commits, confidence 1.0
    assert ("x.py", "z.py") not in pairs       # only 1 shared commit
    assert ("w.py", "z.py") not in pairs       # only via mass commits
