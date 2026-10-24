"""Stage 1 — INGEST.

Clone a GitHub repo *blobless* (full commit history, file contents fetched lazily)
and read the complete git log with rename detection.

We deliberately avoid `--depth 1`: churn, authorship and co-change all need the
full history, and `--filter=blob:none` keeps the clone fast anyway.
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from git import Repo

REPOS_DIR = Path(__file__).resolve().parents[2] / ".repos"

_REC = "\x1e"  # record separator between commits
_FLD = "\x1f"  # field separator inside a commit header


@dataclass
class FileChange:
    status: str               # A, M, D, R
    path: str                 # path after the change
    old_path: str | None = None  # set for renames


@dataclass
class Commit:
    sha: str
    author_email: str
    author_name: str
    timestamp: int
    message: str
    changes: list[FileChange] = field(default_factory=list)


def repo_slug(url: str) -> str:
    """'https://github.com/tiangolo/fastapi(.git)' -> 'tiangolo__fastapi'."""
    m = re.search(r"github\.com[/:]([^/]+)/([^/.]+?)(?:\.git)?/?$", url.strip())
    if not m:
        raise ValueError(f"not a GitHub repo URL: {url}")
    return f"{m.group(1)}__{m.group(2)}".lower()


def clone(url: str, dest_root: Path = REPOS_DIR) -> Path:
    """Blobless-clone `url` (or fetch if already present). Returns the local path."""
    dest = dest_root / repo_slug(url)
    dest_root.mkdir(parents=True, exist_ok=True)
    if (dest / ".git").exists():
        subprocess.run(["git", "-C", str(dest), "fetch", "-q", "origin"], check=True)
        subprocess.run(["git", "-C", str(dest), "reset", "-q", "--hard", "origin/HEAD"], check=True)
    else:
        subprocess.run(
            ["git", "clone", "-q", "--filter=blob:none", url, str(dest)],
            check=True,
        )
    return dest


def read_log(repo_path: Path, rev: str = "HEAD") -> list[Commit]:
    """Full first-parent-agnostic history (merges skipped), oldest first, renames followed."""
    repo = Repo(repo_path)
    raw = repo.git.log(
        rev,
        "--no-merges",
        "-M",
        "--name-status",
        f"--format={_REC}%H{_FLD}%ae{_FLD}%an{_FLD}%at{_FLD}%s",
    )
    commits: list[Commit] = []
    for block in raw.split(_REC):
        if not block.strip():
            continue
        header, _, body = block.partition("\n")
        sha, email, name, ts, msg = header.split(_FLD, 4)
        c = Commit(sha, email.lower(), name, int(ts), msg)
        for line in body.splitlines():
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            status = parts[0][0]
            if status in "RC" and len(parts) == 3:
                c.changes.append(FileChange("R" if status == "R" else "A", parts[2], parts[1]))
            else:
                c.changes.append(FileChange(status, parts[-1]))
        commits.append(c)
    commits.reverse()
    return commits


def ingest(url: str) -> tuple[Path, list[Commit]]:
    path = clone(url)
    return path, read_log(path)


if __name__ == "__main__":
    import sys
    import time

    t0 = time.time()
    p, log = ingest(sys.argv[1])
    renames = sum(1 for c in log for ch in c.changes if ch.status == "R")
    authors = {c.author_email for c in log}
    print(f"{p}: {len(log)} commits, {len(authors)} authors, {renames} renames "
          f"in {time.time() - t0:.1f}s")
