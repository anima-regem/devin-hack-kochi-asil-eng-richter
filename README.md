# Devin Hack Kochi

A repository template for participants at Devin Hack Kochi. It contains event guidance and documentation scaffolding; follow the organizers' current project-start instructions.

**[Event rules](RULES.md)** · **[Agent instructions](AGENTS.md)**

## Event details

Devin Hack Kochi has no major AI usage constraints. Participants may use Devin and other AI tools, models, and providers; this template does not require Codex or restrict AI usage to OpenAI. AI usage notes are project documentation, not an additional event eligibility requirement.

The organizer shared an older event template. Follow the current organizer announcements for logistics, participation format, eligibility, submission timing, and credits; the older template's details do not apply. See [RULES.md](RULES.md).

## Use this template

1. Select **Use this template → Create a new repository** on GitHub. Create your own project repository and clone it.
2. Read [RULES.md](RULES.md) and [AGENTS.md](AGENTS.md) before building. Follow the organizers' current project-start instructions.
3. Fill in the project overview below as you build. Use any suitable language or framework, keeping the implementation simple.
4. Record meaningful changes in [CHANGELOG.md](CHANGELOG.md) and, if maintained, your actual AI assistance in [AI_USAGE.md](AI_USAGE.md). Commit after completed milestones; aim for a meaningful checkpoint about every 30 minutes.
5. Complete [SUBMISSION.md](SUBMISSION.md) with your code repository, short project description, and working demo. Follow submission instructions announced by the organizers.

This template has no application code or required technology stack. The documentation and commit cadence are repository workflow guidance; the event participation rules are in [RULES.md](RULES.md).

## Project overview — complete during the event

- **Project name:** Richter — measure the magnitude of risk in any codebase
- **Short description:** Richter ingests a public GitHub repo and predicts what breaks when you change a file (blast radius), where work keeps getting reworked (fix-heavy churn), and which files are secretly coupled (co-change with no import link). It fuses these into one magnitude score and writes guard notes and unblock plans with an LLM. It helps engineers and reviewers touch risky code safely.
- **Team:** Muhammed Asil Pari ([@asil-eng](https://github.com/asil-eng))
- **Working demo:** Local — see *Run the project* below.
- **Technology stack:** Python 3 + FastAPI, GitPython, `ast`, networkx (backend); React + Vite + TypeScript, three.js (frontend); OpenAI `gpt-4o-mini` (notes).

### Run the project

Replace these placeholders with commands that actually work for your project:

1. Prerequisites and versions: Python 3.11+ (tested on 3.14), git 2.30+, Node 20.19+ (tested on 24)
2. Dependency installation: `cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` and `cd frontend && npm install`
3. Environment setup: `cp .env.example .env` and set `OPENAI_API_KEY` (only needed for guard notes / ask-the-repo on fresh repos)
4. Start the project: backend `cd backend && .venv/bin/uvicorn richter.api:app --port 8000`; frontend `cd frontend && npm run dev` → http://localhost:5173. The demo repos (rich, fastapi, black) also load with the frontend alone. Analyze a new repo from the UI or with `.venv/bin/python -m richter.cli analyze <github-url> [--include-tests]`. Precompute time-travel frames with `.venv/bin/python -m richter.cli snapshots <github-url>`.
5. Run checks or tests: `cd backend && .venv/bin/python -m pytest -q`

### Current status

- Working features: Stage 1 ingest (blobless clone, full history, renames); stage 2 parsers — import graph (`python -m richter.deps <repo>`) and git stats/co-change (`python -m richter.gitstats <repo>`); stage 3 risk engine — blast radius, structural/human risk, magnitude, bus factor, single JSON model; stage 4 agent (guard notes, unblock plans, ask-the-repo) and FastAPI server (`cd backend && .venv/bin/uvicorn richter.api:app --port 8000`)
- Known limitations: Python repos only for now. First ingest of a large repo is slow (~4 min for fastapi) because rename detection lazily fetches file contents; later runs reuse the clone.
- Libraries, APIs, and public datasets used: [FastAPI](https://fastapi.tiangolo.com), [GitPython](https://github.com/gitpython-developers/GitPython), [networkx](https://networkx.org), [OpenAI API](https://platform.openai.com). Demo repos analyzed: public GitHub repositories (fastapi, httpx, rich).

See [AI_USAGE.md](AI_USAGE.md) for AI assistance and [CHANGELOG.md](CHANGELOG.md) for the development record.
