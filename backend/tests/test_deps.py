from pathlib import Path

from richter.deps import build_import_graph


def write(root: Path, rel: str, src: str = "") -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(src)


def test_src_layout_relative_imports_and_reexports(tmp_path: Path):
    write(tmp_path, "src/pkg/__init__.py", "from .routing import Router\nfrom .util import *\n")
    write(tmp_path, "src/pkg/routing.py", "from . import util\nclass Router: pass\n")
    write(tmp_path, "src/pkg/util.py", "def helper(): pass\n")
    write(tmp_path, "src/pkg/sub/__init__.py")
    write(tmp_path, "src/pkg/sub/deep.py", "from ..routing import Router\nfrom pkg import helper\n")
    write(tmp_path, "src/pkg/app.py", "from pkg import Router\nimport pkg.sub.deep\n")
    write(tmp_path, "tests/test_app.py", "from pkg import app\n")

    g = build_import_graph(tmp_path)
    edges = set(g.edges())

    assert ("src/pkg/routing.py", "src/pkg/util.py") in edges          # from . import util
    assert ("src/pkg/sub/deep.py", "src/pkg/routing.py") in edges      # from ..routing
    assert ("src/pkg/sub/deep.py", "src/pkg/util.py") in edges         # star re-export
    assert ("src/pkg/app.py", "src/pkg/routing.py") in edges           # named re-export
    assert ("src/pkg/app.py", "src/pkg/sub/deep.py") in edges          # import a.b.c
    assert ("src/pkg/app.py", "src/pkg/__init__.py") not in edges      # no star collapse
    assert "tests/test_app.py" not in g                                # excluded by default


def test_include_tests_option(tmp_path: Path):
    write(tmp_path, "pkg/__init__.py")
    write(tmp_path, "pkg/a.py")
    write(tmp_path, "tests/test_a.py", "from pkg import a\n")
    g = build_import_graph(tmp_path, include_tests=True)
    assert ("tests/test_a.py", "pkg/a.py") in g.edges()
