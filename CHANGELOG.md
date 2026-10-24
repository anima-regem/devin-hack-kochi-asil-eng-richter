# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

## 2026-10-24T21:30:22+05:30 — Stage 4: agent actions + API

- Changed: Added `backend/richter/agent.py` (gpt-4o-mini guard notes, unblock plans, ask-the-repo with JSON output; disk cache in `data/cache/`; ask-the-repo file paths validated against the model; labelled rule-based fallback when no key) and `backend/richter/api.py` (FastAPI: repos, model, snapshots, background analyze jobs with stages, note, ask). Committed demo models for rich and black.
- Why: Agent actions write notes, not code; small prompts (one file's metrics, dependents, capped excerpt). Cache makes demos instant/offline. Path validation guarantees no invented file is ever highlighted.
- Validation: `pytest` 10 passed (invented paths dropped; offline fallback labelled `rules`). Ran uvicorn and curled /api/repos (3 models), /api/note (rules fallback for rich/console.py), /api/ask (503 without key), /api/analyze with bad URL (400).
- Limitations: No OPENAI_API_KEY configured yet, so no AI responses have been generated or cached; only the rule-based fallback is verified. httpx dropped from demos (23 files).

## 2026-10-24T21:28:04+05:30 — Stage 3: risk engine + JSON model

- Changed: Added `backend/richter/risk.py` (PageRank importance, BFS reverse-import blast radius with hop distances, structural = 0.5·rank(PageRank)+0.5·rank(blast size), human = log-min-max of churn×smoothed fix ratio, magnitude = geometric mean with 0.05 floor, bus-factor flag), `pipeline.py` (one index-based JSON model), `cli.py`. Added numpy/scipy (required by networkx PageRank). Committed `data/models/fastapi__fastapi.json`.
- Why: The risk engine is the core: pure functions, isolated from I/O, so the same scoring powers the live API and precomputed snapshots.
- Validation: `pytest` 8 passed. fastapi sanity check: top-12 magnitude includes routing.py (#1), dependencies/utils.py, encoders.py, params.py, exceptions.py, applications.py; bottom 5 are trivial shims. Scoring frozen at SCORING_VERSION 1.0.
- Limitations: Magnitude quartiles on fastapi are 0.05 / 0.17 / 0.48, so ~25% of files sit at the floor (leaf files with little history).

## 2026-10-24T21:25:21+05:30 — Stage 2: dependency + git parsers

- Changed: Added `backend/richter/deps.py` (ast import graph with relative-import, src-layout and `__init__` re-export resolution; excludes tests/, docs_src/, docs/, examples/ by default with `include_tests` option) and `backend/richter/gitstats.py` (rename-aware churn, authors, smoothed fix ratio `(fixes+1)/(churn+5)`, co-change with >30-file commit skip, ≥3 shared commits, confidence ≥0.5). Tests in `backend/tests/`.
- Why: Two independent signals over the same files: structural (who imports whom) and human (where work is repeatedly reworked). Re-export resolution prevents the graph collapsing into a star on `__init__.py`.
- Validation: `pytest` 5 passed. fastapi: 67 files, 125 edges, 2% of edges on `__init__.py`; spot-checked `applications.py` imports against source. Top human risk = `dependencies/utils.py` (183 commits, 60 fixes) and `routing.py`; 17 ghost co-change pairs (the `security/*` modules).
- Limitations: Imports consumed outside the repo (library public API) are invisible, so public entry modules show low in-repo importance. Fix detection is a commit-message regex.

## 2026-10-24T21:16:00+05:30 — Stage 1: ingest

- Changed: Added `backend/richter/ingest.py` (blobless clone via `git clone --filter=blob:none`, full `git log --no-merges -M --name-status` parse into commits + file changes), `backend/requirements.txt`, `.env.example`, `.gitignore` entries for `.repos/`.
- Why: Churn, authorship and co-change need full history; blobless clone keeps it fast. Rename detection keeps file histories continuous.
- Validation: `python -m richter.ingest https://github.com/fastapi/fastapi` → 7932 commits, 920 authors, 1045 renames in 238.6 s on first run; re-reading the cached clone returned 7932 commits.
- Limitations: First run on large repos is slow because rename detection lazily fetches blobs.

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.
