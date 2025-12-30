# api_stateless.py
from __future__ import annotations
import io
import json
import hashlib
import mimetypes
from datetime import datetime, timezone
from typing import Any, Dict, List

import sys
from pathlib import Path
engine_root = Path(__file__).parent.parent
for folder in ["core", "sanitizers", "models", "utils", "api"]:
    p = str(engine_root / folder)
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Shared logic
from shared_logic import (
    sha256_hash, get_extension, get_content_type, 
    sanitize_with_available_tools, humanize_findings
)

from scan_file import scan_bytes

app = FastAPI(title="SafeDocs Stateless Engine", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True, "mode": "stateless"}

@app.post("/scan")
async def scan_file(file: UploadFile = File(...)):
    """
    Stateless process:
    1. Receive file
    2. Scan Original
    3. Sanitize
    4. Scan Clean
    5. Return EVERYTHING (no DB save)
    """
    raw = await file.read()
    filename = file.filename or "upload.bin"
    content_type = get_content_type(filename)
    sha = sha256_hash(raw)
    ext = get_extension(filename) or ""

    # 1. Scan Original
    try:
        raw_result = scan_bytes(raw, filename=filename, content_type=content_type)
        if not isinstance(raw_result, dict): raise RuntimeError("scanner returned non-dict")
    except Exception as e:
        raw_result = {"error": f"scan failure: {e}", "verdict": "benign", "risk_score": 0.0}

    # Extract verdicts
    verdict = raw_result.get("verdict")
    risk_score = float(raw_result.get("risk_score") or 0.0)
    if verdict in (None, "scan_error"):
        verdict = "malicious" if risk_score >= 0.5 else "benign"
    
    raw_findings = raw_result.get("findings") or raw_result.get("report", {}).get("findings") or []
    nice_findings = humanize_findings(raw_findings)

    # 2. Sanitize
    try:
        if isinstance(raw_result.get("clean_bytes"), (bytes, bytearray)):
             san_out = {
                "clean_bytes": bytes(raw_result["clean_bytes"]),
                "sanitizer": {"engine": "scanner_clean_bytes", "changed": (sha256_hash(raw_result["clean_bytes"]) != sha)}
             }
        else:
            san_out = sanitize_with_available_tools(ext, raw, filename)
    except Exception as e:
        san_out = {"clean_bytes": raw, "sanitizer": {"engine": "error", "error": str(e), "changed": False}}

    clean_bytes = san_out["clean_bytes"]
    sanitizer_meta = san_out.get("sanitizer", {})

    # 3. Scan Clean
    clean_sha = sha256_hash(clean_bytes)
    try:
        clean_result = scan_bytes(clean_bytes, filename=f"clean_{filename}", content_type=content_type)
    except Exception:
        clean_result = {}

    post_risk = float(clean_result.get("risk_score") or 0.0)
    post_verdict = clean_result.get("verdict") or ("malicious" if post_risk >= 0.5 else "benign")
    post_findings = clean_result.get("findings") or []
    
    # Extract signals and meta from nested report structure
    report_data = raw_result.get("report", {})
    signals_data = report_data.get("signals", {})
    meta_data = raw_result.get("meta", report_data.get("meta", {}))
    
    # Add lowercase keys for frontend compatibility
    if signals_data:
        signals_with_aliases = dict(signals_data)
        if "P_LGBM" in signals_with_aliases:
            signals_with_aliases["lgbm"] = signals_with_aliases["P_LGBM"]
        if "P_TREE" in signals_with_aliases:
            signals_with_aliases["tree"] = signals_with_aliases["P_TREE"]
        if "P_DL" in signals_with_aliases:
            signals_with_aliases["dl"] = signals_with_aliases["P_DL"]
        if "P_RULES" in signals_with_aliases:
            signals_with_aliases["rules"] = signals_with_aliases["P_RULES"]
        signals_data = signals_with_aliases
    
    # Return full analysis bundle
    return JSONResponse({
        "ok": True,
        "filename": filename,
        "content_type": content_type,
        "sha256": sha,
        "size": len(raw),
        "verdict": verdict,
        "risk_score": risk_score,
        "findings": nice_findings,
        "signals": signals_data,
        "model_scores": signals_data,
        "meta": meta_data if meta_data else {
            "file": filename,
            "mime_type": content_type,
            "size_bytes": len(raw),
            "sha256": sha,
        },
        "sanitized": sanitizer_meta.get("changed", False),
        "sanitizer": sanitizer_meta,
        "clean_sha256": clean_sha,
        "clean_size": len(clean_bytes),
        "clean_verdict": post_verdict,
        "clean_risk_score": post_risk,
        "clean_findings": humanize_findings(post_findings),
        "clean_file_b64": clean_bytes.hex(),
    })
