"""Vercel Python entrypoint. This is a self-contained copy of backend/app
(kept in sync manually -- see scripts/sync-api.sh) rather than reaching
into the sibling backend/ directory at runtime: Vercel's Python bundler
does not reliably include files outside a function's own directory, and
relying on that was the actual cause of the first deploy's 500 errors.

Mounts the app (unchanged, routes defined without an /api prefix) under
/api -- Starlette's Mount strips the prefix before dispatching, so no
route in app/main.py needs to change for this to work."""

from fastapi import FastAPI
from app.main import app as backend_app

app = FastAPI()
app.mount("/api", backend_app)
