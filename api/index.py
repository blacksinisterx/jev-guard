"""Vercel Python entrypoint. This is a self-contained copy of backend/app
(kept in sync manually -- see scripts/sync-api.sh) rather than reaching
into the sibling backend/ directory at runtime: Vercel's Python bundler
does not reliably include files outside a function's own directory, and
relying on that was the cause of an earlier deploy's 500 errors.

Vercel loads this file via importlib (see the vc_init.py traceback in a
FUNCTION_INVOCATION_FAILED log), not as a directly-run script -- Python
does NOT auto-add the file's own directory to sys.path for that loading
path the way it does for `python index.py`. Adding it explicitly below
is required, not optional; omitting it is what caused
"ModuleNotFoundError: No module named 'app'" on the first attempt at
this self-contained layout.

Mounts the app (unchanged, routes defined without an /api prefix) under
/api -- Starlette's Mount strips the prefix before dispatching, so no
route in app/main.py needs to change for this to work."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI  # noqa: E402
from app.main import app as backend_app  # noqa: E402

app = FastAPI()
app.mount("/api", backend_app)
