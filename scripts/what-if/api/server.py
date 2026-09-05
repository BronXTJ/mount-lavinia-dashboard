"""Local What-if sDNA job worker (FastAPI).

Start from repo root:
  python scripts/what-if/api/server.py

Or: npm run what-if:worker

Runs existing run_sdna_scenario.py in a subprocess (sDNA chdirs safely).
"""
from __future__ import annotations

import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "scripts" / "what-if" / "run_sdna_scenario.py"
SDNA_ROOT = Path(r"C:\Program Files (x86)\sDNA")
JOBS_ROOT = ROOT / "json_files" / "Urban_morpho_analysis" / "_what_if_work" / "jobs"

ALLOWED_ARTIFACT = re.compile(r"^(proposed_links|summary|closeness_\d+|betweenness_\d+)\.(geojson|json)$")
JOB_ID_RE = re.compile(r"^[0-9a-f]{12}$")
MAX_FEATURES = 80
MAX_BODY_BYTES = 512_000
JOB_TTL_SECONDS = 7 * 24 * 60 * 60
SDNA_TIMEOUT_SECONDS = 600
PAIRING_TOKEN = os.environ.get("WHAT_IF_PAIRING_TOKEN") or secrets.token_urlsafe(24)

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "https://bronxtj.github.io",
    "https://BronXTJ.github.io",
]

app = FastAPI(title="What-if sDNA worker", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _lna_cors_headers(origin: str, extra_request_headers: str = "*") -> dict[str, str]:
    headers = {
        "Access-Control-Allow-Private-Network": "true",
        "Access-Control-Allow-Local-Network": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": extra_request_headers or "*",
    }
    if origin in CORS_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
    return headers


@app.middleware("http")
async def private_network_access(request: Request, call_next):
    """Allow HTTPS GitHub Pages → local worker (Chrome Private / Local Network Access)."""
    origin = request.headers.get("origin", "")
    pna_requested = request.headers.get("access-control-request-private-network")
    lna_requested = request.headers.get("access-control-request-local-network")

    if request.method == "OPTIONS" and (pna_requested or lna_requested):
        return Response(
            status_code=204,
            headers=_lna_cors_headers(
                origin,
                request.headers.get("access-control-request-headers", "*"),
            ),
        )

    response = await call_next(request)
    if origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        response.headers["Access-Control-Allow-Local-Network"] = "true"
        response.headers.setdefault("Access-Control-Allow-Origin", origin)
    return response

_lock = threading.Lock()
_jobs: dict[str, dict[str, Any]] = {}


class JobCreate(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict[str, Any]] = Field(default_factory=list)


def _jobs_root() -> Path:
    return JOBS_ROOT.resolve()


def _validated_job_dir(job_id: str) -> Path:
    if not JOB_ID_RE.fullmatch(job_id):
        raise HTTPException(status_code=400, detail="Invalid job id")
    root = _jobs_root()
    path = (JOBS_ROOT / job_id).resolve()
    if path.parent != root:
        raise HTTPException(status_code=400, detail="Invalid job id")
    return path


def _job_dir(job_id: str) -> Path:
    return _validated_job_dir(job_id)


def _require_pairing_token(request: Request) -> None:
    auth = request.headers.get("authorization", "")
    header = request.headers.get("x-what-if-token", "")
    provided = ""
    if auth.lower().startswith("bearer "):
        provided = auth[7:].strip()
    elif header:
        provided = header.strip()
    if not provided:
        raise HTTPException(status_code=401, detail="Pairing token required")
    try:
        matched = secrets.compare_digest(provided, PAIRING_TOKEN)
    except ValueError:
        matched = False
    if not matched:
        raise HTTPException(status_code=401, detail="Pairing token required")


def _sweep_old_jobs() -> None:
    if not JOBS_ROOT.exists():
        return
    cutoff = time.time() - JOB_TTL_SECONDS
    for child in JOBS_ROOT.iterdir():
        if not child.is_dir():
            continue
        try:
            if child.stat().st_mtime < cutoff:
                shutil.rmtree(child, ignore_errors=True)
        except OSError:
            continue


def _set_job(job_id: str, **fields: Any) -> None:
    with _lock:
        job = _jobs.setdefault(job_id, {"id": job_id, "status": "queued"})
        job.update(fields)


def _get_job(job_id: str) -> dict[str, Any] | None:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def _run_job(job_id: str) -> None:
    out_dir = _job_dir(job_id)
    links = out_dir / "proposed_links.geojson"
    _set_job(job_id, status="running", error=None)
    try:
        # Single-flight: only one sDNA process at a time on this machine.
        with _run_job.flight:  # type: ignore[attr-defined]
            proc = subprocess.run(
                [sys.executable, str(SCRIPT), "--links", str(links), "--out-dir", str(out_dir)],
                cwd=str(ROOT),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=SDNA_TIMEOUT_SECONDS,
            )
        log_path = out_dir / "worker.log"
        log_path.write_text(
            (proc.stdout or "") + "\n--- stderr ---\n" + (proc.stderr or ""),
            encoding="utf-8",
        )
        if proc.returncode != 0:
            msg = (proc.stderr or proc.stdout or f"exit {proc.returncode}").strip()
            _set_job(job_id, status="error", error=msg[-2000:])
            return
        summary = None
        summary_path = out_dir / "summary.json"
        if summary_path.exists():
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
        _set_job(job_id, status="done", error=None, summary=summary)
    except subprocess.TimeoutExpired:
        _set_job(job_id, status="error", error=f"sDNA job timed out after {SDNA_TIMEOUT_SECONDS}s")
    except Exception as exc:  # noqa: BLE001 — surface to client
        _set_job(job_id, status="error", error=str(exc))


_run_job.flight = threading.Lock()  # type: ignore[attr-defined]


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "sdna": SDNA_ROOT.exists(),
        "script": SCRIPT.exists(),
        "prepared": (
            ROOT
            / "json_files/Urban_morpho_analysis/betweeness_centrality/ClosenessCentrality/ClosenessCentrality/500_closeness.shp"
        ).exists(),
    }


@app.post("/v1/jobs")
def create_job(
    request: Request,
    body: JobCreate,
    _: None = Depends(_require_pairing_token),
) -> dict[str, Any]:
    raw_len = request.headers.get("content-length")
    if raw_len and raw_len.isdigit() and int(raw_len) > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail="Payload too large")
    if body.type != "FeatureCollection" or not body.features:
        raise HTTPException(status_code=400, detail="Need a FeatureCollection with at least one feature")
    if len(body.features) > MAX_FEATURES:
        raise HTTPException(status_code=400, detail=f"At most {MAX_FEATURES} features allowed")
    _sweep_old_jobs()
    job_id = uuid.uuid4().hex[:12]
    out_dir = _job_dir(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    geojson = {"type": "FeatureCollection", "features": body.features}
    (out_dir / "proposed_links.geojson").write_text(json.dumps(geojson, indent=2), encoding="utf-8")
    _set_job(job_id, status="queued", error=None, summary=None)
    threading.Thread(target=_run_job, args=(job_id,), daemon=True).start()
    return {"id": job_id, "status": "queued"}


@app.get("/v1/jobs/{job_id}")
def get_job(job_id: str, _: None = Depends(_require_pairing_token)) -> dict[str, Any]:
    job = _get_job(job_id)
    if not job:
        # Recover done jobs after worker restart if artifacts exist
        out_dir = _job_dir(job_id)
        if (out_dir / "summary.json").exists():
            summary = json.loads((out_dir / "summary.json").read_text(encoding="utf-8"))
            return {"id": job_id, "status": "done", "error": None, "summary": summary}
        raise HTTPException(status_code=404, detail="Unknown job")
    return {
        "id": job["id"],
        "status": job["status"],
        "error": job.get("error"),
        "summary": job.get("summary"),
    }


@app.get("/v1/jobs/{job_id}/artifacts/{filename}")
def get_artifact(
    job_id: str,
    filename: str,
    _: None = Depends(_require_pairing_token),
) -> FileResponse:
    if not ALLOWED_ARTIFACT.match(filename):
        raise HTTPException(status_code=400, detail="Invalid artifact name")
    path = (_job_dir(job_id) / filename).resolve()
    root = _jobs_root()
    if root not in path.parents:
        raise HTTPException(status_code=400, detail="Invalid artifact path")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found")
    media = "application/geo+json" if filename.endswith(".geojson") else "application/json"
    return FileResponse(path, media_type=media, filename=filename)


def main() -> None:
    import uvicorn

    JOBS_ROOT.mkdir(parents=True, exist_ok=True)
    _sweep_old_jobs()
    print(f"PAIRING TOKEN (required on /v1/jobs*): {PAIRING_TOKEN}", flush=True)
    print("Paste this token in the dashboard Connect prompt. /health stays open.", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=8787, log_level="info")


if __name__ == "__main__":
    main()
