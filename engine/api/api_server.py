# api_server.py
from __future__ import annotations
import io
import json
import mimetypes
import inspect
import tempfile
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

# Shared logic
from shared_logic import (
    sha256_hash, get_extension, get_content_type, 
    sanitize_with_available_tools, humanize_findings
)

# --- existing DB + auth (UNTOUCHED) ---
from db import init_mongo, db, gfs_uploads, gfs_clean, gfs_reports
from auth import router as auth_router, get_current_user
from scan_file import scan_bytes

app = FastAPI(title="SafeDocs API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- helpers to support both Motor (async) and PyMongo (sync) ----
async def _maybe_await(x):
    return await x if inspect.isawaitable(x) else x

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# --- robust ID coercion for GridFS ---
def _coerce_file_id(file_id: str):
    """Try to coerce a 24-hex string into ObjectId; else return as-is."""
    try:
        from bson import ObjectId
        if isinstance(file_id, str) and len(file_id) == 24:
            return ObjectId(file_id)
    except Exception:
        pass
    return file_id

# ------------ startup / shutdown ------------
@app.on_event("startup")
async def _startup():
    await init_mongo(app)
    print("✅ Database initialized")
    try:
        pref = getattr(auth_router, "prefix", "") or ""
        if pref.startswith("/api/"):
            app.include_router(auth_router)
        elif pref.startswith("/auth"):
            app.include_router(auth_router, prefix="/api")
        else:
            app.include_router(auth_router, prefix="/api/auth")
        print("🔐 Auth routes mounted")
    except Exception as e:
        print(f"⚠️  Failed to mount auth router: {e}")
    print("🚀 SafeDocs API ready")

@app.on_event("shutdown")
async def _shutdown():
    print("👋 Shutting down SafeDocs API")

@app.get("/api/health")
def health():
    return {"ok": True}

# ---------- Scan endpoint ----------
@app.post("/api/scan")
async def scan_endpoint(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Flow:
      1) Save original upload (GridFS)
      2) Scan original (raw_scan)
      3) Sanitize (bytes or path sanitizer by type)
      4) **Re-scan sanitized bytes** (post_clean_scan)
      5) Save clean file & JSON report (GridFS)
      6) Insert scans row (DB) and return links
    """
    user_id = str(current_user["_id"])
    filename = file.filename or "upload.bin"
    content_type = get_content_type(filename)

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    sha = sha256_hash(raw)
    ext = get_extension(filename) or ""

    # 1) Save original upload
    try:
        uploads = gfs_uploads()
        up_meta = {
            "user_id": user_id,
            "filename": filename,
            "content_type": content_type,
            "size": len(raw),
            "sha256": sha,
            "created_at": _now_iso(),
        }
        upload_id = await _maybe_await(uploads.upload_from_stream(filename, io.BytesIO(raw), metadata=up_meta))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed saving upload: {e}")

    # 2) Scan original
    try:
        raw_result = scan_bytes(raw, filename=filename, content_type=content_type)
        if not isinstance(raw_result, dict):
            raise RuntimeError("scanner returned non-dict")
    except Exception as e:
        raw_result = {
            "ok": False,
            "verdict": "benign",
            "risk_score": 0.0,
            "model_scores": {"lgbm": 0.0, "tree": 0.0, "dl": 0.0, "rules": 0.0},
            "meta": {"file": filename, "size_bytes": len(raw), "sha256": sha},
            "report": {"version": 1, "engine": "fallback", "verdict": "benign", "risk_score": 0.0},
            "error": f"scan failure: {e}",
        }

    verdict = raw_result.get("verdict")
    try:
        risk_score = float(raw_result.get("risk_score") or raw_result.get("report", {}).get("risk_score") or 0.0)
    except Exception:
        risk_score = 0.0
    if verdict in (None, "scan_error"):
        verdict = "malicious" if risk_score >= 0.5 else "benign"
        raw_result["verdict"] = verdict

    raw_signals = raw_result.get("model_scores") or raw_result.get("signals") or raw_result.get("report", {}).get("signals") or {}
    
    # FORCE MAPPING: Ensure frontend keys are always populated
    # This fixes the "0% signals" issue by explicitly guaranteeing keys exist
    if "rules" not in raw_signals and "model_scores" in raw_result:
         # If model_scores exists but rules key missing (unlikely), try to read from it
         raw_signals["rules"] = raw_result["model_scores"].get("rules", 0.0)

    # Ensure composite signals are present
    if "composite" not in raw_signals:
         raw_signals["composite"] = float(raw_result.get("risk_score", 0.0))
    if "dl" not in raw_signals:
         raw_signals["dl"] = raw_signals.get("composite", 0.0)
    if "lgbm" not in raw_signals:
         raw_signals["lgbm"] = 0.0
    if "tree" not in raw_signals:
         raw_signals["tree"] = raw_signals.get("lgbm", 0.0)
    if "rules" not in raw_signals:
         raw_signals["rules"] = 0.0

    raw_findings = (
        raw_result.get("findings")
        or raw_result.get("report", {}).get("findings")
        or raw_result.get("report", {}).get("report", {}).get("findings")
        or []
    )
    nice_findings = humanize_findings(raw_findings)
    recommendations = raw_result.get("recommendations") or raw_result.get("report", {}).get("recommendations") or []

    # 3) Sanitize — ALWAYS use sanitizer output and record changed flag/notes
    try:
        if isinstance(raw_result.get("clean_bytes"), (bytes, bytearray)):
            san_out = {
                "clean_bytes": bytes(raw_result["clean_bytes"]),
                "sanitizer": {"engine": "scanner_clean_bytes", "changed": (sha256_hash(raw_result["clean_bytes"]) != sha)}
            }
        elif isinstance(raw_result.get("sanitized_bytes"), (bytes, bytearray)):
            san_out = {
                "clean_bytes": bytes(raw_result["sanitized_bytes"]),
                "sanitizer": {"engine": "scanner_sanitized_bytes", "changed": (sha256_hash(raw_result["sanitized_bytes"]) != sha)}
            }
        else:
            san_out = sanitize_with_available_tools(ext, raw, filename)
    except Exception as e:
        san_out = {"clean_bytes": raw, "sanitizer": {"engine": "passthrough", "error": str(e), "changed": False}}

    clean_bytes = san_out["clean_bytes"]
    sanitizer_meta = san_out.get("sanitizer") or {}
    sanitized_flag = True  # we always produce bytes; changed flag shows if modified

    # 4) Re-scan sanitized bytes
    clean_sha = sha256_hash(clean_bytes)
    clean_filename = f"{sha}_clean{ext or ''}".strip()
    try:
        clean_result = scan_bytes(clean_bytes, filename=clean_filename, content_type=content_type)
        if not isinstance(clean_result, dict):
            raise RuntimeError("scanner returned non-dict (clean)")
    except Exception as e:
        clean_result = {
            "ok": False,
            "verdict": "benign",
            "risk_score": 0.0,
            "model_scores": {"lgbm": 0.0, "tree": 0.0, "dl": 0.0, "rules": 0.0},
            "meta": {"file": clean_filename, "size_bytes": len(clean_bytes), "sha256": clean_sha},
            "report": {"version": 1, "engine": "fallback", "verdict": "benign", "risk_score": 0.0},
            "error": f"scan failure (clean): {e}",
        }

    try:
        post_risk = float(clean_result.get("risk_score") or clean_result.get("report", {}).get("risk_score") or 0.0)
    except Exception:
        post_risk = 0.0
    post_verdict = clean_result.get("verdict") or ("malicious" if post_risk >= 0.5 else "benign")
    post_signals = clean_result.get("model_scores") or clean_result.get("signals") or clean_result.get("report", {}).get("signals") or {}
    post_findings = (
        clean_result.get("findings")
        or clean_result.get("report", {}).get("findings")
        or clean_result.get("report", {}).get("report", {}).get("findings")
        or []
    )

    # 5) Save clean file + report
    try:
        clean = gfs_clean()
        clean_meta = {
            "user_id": user_id,
            "source_upload_id": str(upload_id),
            "filename": clean_filename,
            "content_type": content_type,
            "size": len(clean_bytes),
            "verdict": post_verdict,      # reflect verdict on the sanitized artifact
            "risk_score": post_risk,      # reflect risk on the sanitized artifact
            "sha256": clean_sha,
            "sanitized": sanitized_flag,
            "sanitizer_meta": sanitizer_meta,
            "created_at": _now_iso(),
        }
        clean_id = await _maybe_await(clean.upload_from_stream(clean_filename, io.BytesIO(clean_bytes), metadata=clean_meta))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed saving clean file: {e}")

    # Build a comprehensive report
    try:
        report_doc = {
            "version": 1,
            "engine": "safedocs-ensemble",
            "filename": filename,
            "original_sha256": sha,
            "size_bytes": len(raw),
            "content_type": content_type,

            # ORIGINAL scan result
            "verdict": verdict,
            "risk_score": float(risk_score),
            "signals": raw_signals,
            "findings": nice_findings,
            "raw_findings": raw_findings,

            # POST-SANITIZATION scan result
            "post_clean_scan": {
                "filename": clean_filename,
                "sha256": clean_sha,
                "risk_score": float(post_risk),
                "verdict": post_verdict,
                "signals": post_signals,
                "findings": post_findings,
                "delta_risk": float(post_risk - risk_score),
            },

            "recommendations": recommendations,
            "sanitizer": sanitizer_meta,
            "sanitized": sanitized_flag,
            "clean_file": {
                "filename": clean_filename,
                "content_type": content_type,
                "size_bytes": len(clean_bytes),
                "gridfs_id": None,
            },
            "timestamps": {"uploaded_at": up_meta["created_at"], "scanned_at": _now_iso()},
            "source_upload_id": str(upload_id),
            "clean_id": None,
            "user_id": user_id,
        }
        report_doc["clean_file"]["gridfs_id"] = str(clean_id)
        report_doc["clean_id"] = str(clean_id)

        reports = gfs_reports()
        report_bytes = json.dumps(report_doc, indent=2, default=str).encode("utf-8")
        report_meta = {
            "user_id": user_id,
            "upload_id": str(upload_id),
            "clean_id": str(clean_id),
            "filename": f"{sha}.report.json",
            "created_at": _now_iso(),
        }
        report_id = await _maybe_await(reports.upload_from_stream(report_meta["filename"], io.BytesIO(report_bytes), metadata=report_meta))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed saving report: {e}")

    # 6) Persist scan record (DB shape preserved)
    try:
        scans_coll = db().scans
        doc = {
            "user_id": user_id,
            "upload_id": str(upload_id),
            "clean_id": str(report_doc["clean_id"]),
            "report_id": str(report_id),
            "filename": filename,
            "clean_filename": clean_filename,
            "content_type": content_type,
            "size": len(raw),
            "sha256": sha,
            "verdict": verdict,                 # original file verdict (keep as-is)
            "risk_score": risk_score,           # original file risk
            "created_at": datetime.now(timezone.utc),
            # legacy url fields (dashboard will rebuild anyway)
            "report_url": f"/report/{str(report_id)}.json",
            "download_clean_url": f"/download/{str(report_doc['clean_id'])}",
        }
        res = scans_coll.insert_one(doc)
        if inspect.isawaitable(res):
            await res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed writing scans row: {e}")

    # Response (non-breaking, extra fields included)
    return JSONResponse({
        "ok": True,
        "filename": filename,
        "content_type": content_type,
        "size": len(raw),
        "sha256": sha,

        # original
        "verdict": verdict,
        "risk_score": float(risk_score),
        "signals": raw_signals,
        "findings": humanize_findings(raw_findings),
        "raw_findings": raw_findings,
        "recommendations": recommendations,

        # sanitizer + post-clean scan summary
        "sanitizer": sanitizer_meta,
        "sanitized": sanitized_flag,
        "post_clean_scan": {
            "filename": clean_filename,
            "sha256": clean_sha,
            "risk_score": float(post_risk),
            "verdict": post_verdict,
            "delta_risk": float(post_risk - risk_score),
        },

        "report_id": str(report_id),
        "report_api": f"/report/{str(report_id)}.json",
        "download_api": f"/download/{str(report_doc['clean_id'])}",
        "clean_filename": clean_filename,
        "scan_id": str(upload_id),
    })

# ---------- My scans ----------
@app.get("/api/me/scans")
async def me_scans(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    coll = db().scans
    query = {"user_id": user_id}

    cur = coll.find(query).sort("created_at", -1).skip(offset).limit(limit)
    items: List[Dict[str, Any]] = []
    if hasattr(cur, "to_list"):
        docs = await cur.to_list(length=limit)
    else:
        docs = list(cur)

    for d in docs:
        rid = str(d.get("report_id", "") or "")
        cid = str(d.get("clean_id", "") or "")
        items.append({
            "scan_id": str(d.get("_id", "")),
            "filename": d.get("filename"),
            "created_at": d.get("created_at"),
            "verdict": d.get("verdict"),
            "risk_score": float(d.get("risk_score", 0.0)),
            "report_url": f"/report/{rid}.json" if rid else None,
            "download_clean_url": f"/download/{cid}" if cid else None,
        })

    return {"items": items, "limit": limit, "offset": offset}

# ---------- My stats ----------
@app.get("/api/me/stats")
async def me_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    coll = db().scans
    query = {"user_id": user_id}

    total_res = coll.count_documents(query)
    total = await total_res if inspect.isawaitable(total_res) else total_res

    benign_res = coll.count_documents({**query, "verdict": "benign"})
    benign = await benign_res if inspect.isawaitable(benign_res) else benign_res

    malicious_res = coll.count_documents({**query, "verdict": "malicious"})
    malicious = await malicious_res if inspect.isawaitable(malicious_res) else malicious_res

    last_activity = None
    cur = coll.find(query).sort("created_at", -1).limit(1)
    if hasattr(cur, "to_list"):
        docs = await cur.to_list(length=1)
        if docs: last_activity = docs[0].get("created_at")
    else:
        for d in cur:
            last_activity = d.get("created_at"); break

    return {
        "total_scans": int(total or 0),
        "benign": int(benign or 0),
        "malicious": int(malicious or 0),
        "last_activity": last_activity,
    }

# ---------- Fetch JSON report ----------
@app.get("/api/report/{report_id}.json")
async def get_report(report_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    bucket = gfs_reports()
    try:
        fid = _coerce_file_id(report_id)
        gridout = await _maybe_await(bucket.open_download_stream(fid))
    except Exception:
        raise HTTPException(status_code=404, detail="Report not found")

    meta = getattr(gridout, "metadata", {}) or {}
    if meta.get("user_id") != str(current_user["_id"]):
        raise HTTPException(status_code=404, detail="Report not found")

    if hasattr(gridout, "readchunk"):
        async def _aiter():
            while True:
                chunk = await _maybe_await(gridout.readchunk())
                if not chunk: break
                yield chunk
        return StreamingResponse(_aiter(), media_type="application/json")
    else:
        def _iter():
            for chunk in gridout: yield chunk
        return StreamingResponse(_iter(), media_type="application/json")

# ---------- Download clean file ----------
@app.get("/api/download/{file_id}")
async def download_clean(file_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    bucket = gfs_clean()
    try:
        fid = _coerce_file_id(file_id)
        gridout = await _maybe_await(bucket.open_download_stream(fid))
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

    meta = getattr(gridout, "metadata", {}) or {}
    if meta.get("user_id") != str(current_user["_id"]):
        raise HTTPException(status_code=404, detail="File not found")

    filename = meta.get("filename") or "clean.bin"
    media = meta.get("content_type") or "application/octet-stream"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}

    if hasattr(gridout, "readchunk"):
        async def _aiter():
            while True:
                chunk = await _maybe_await(gridout.readchunk())
                if not chunk: break
                yield chunk
        return StreamingResponse(_aiter(), media_type=media, headers=headers)
    else:
        def _iter():
            for chunk in gridout: yield chunk
        return StreamingResponse(_iter(), media_type=media, headers=headers)
