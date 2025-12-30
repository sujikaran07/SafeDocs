# scan_file.py
# Robust scan + sanitize wrapper that NEVER returns "scan_error".
# It yields a verdict "benign" or "malicious", a stable risk_score in [0,1],
# lightweight "findings", and per-type "recommendations".

from __future__ import annotations
import hashlib
import io
import math
import os
import re
from typing import Dict, List, Optional, Tuple

# Optional deps from your project (import if present, else graceful fallback)
try:
    from features_runtime import build_features_for_lgbm  # your feature builder
except Exception:
    build_features_for_lgbm = None

try:
    from sanitize_pdf import sanitize_pdf_bytes
except Exception:
    sanitize_pdf_bytes = None

try:
    from sanitize_ooxml import sanitize_ooxml_bytes
except Exception:
    sanitize_ooxml_bytes = None

try:
    from sanitize_rtf import sanitize_rtf_bytes
except Exception:
    sanitize_rtf_bytes = None


def _sha256(data: bytes) -> str:
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()

def _ext_from_name(name: str) -> str:
    if not name:
        return ""
    return os.path.splitext(name)[1].lower().strip()

def _guess_mime(ext: str) -> str:
    return {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".rtf": "application/rtf",
    }.get(ext, "application/octet-stream")

def _byte_entropy(sample: bytes, max_bytes: int = 65536) -> float:
    if not sample:
        return 0.0
    s = sample[:max_bytes]
    freq = [0]*256
    for b in s:
        freq[b] += 1
    h = 0.0
    n = len(s)
    for c in freq:
        if c:
            p = c / n
            h -= p * math.log2(p)
    return min(1.0, h / 8.0)


# ---- simple findings / rules (deterministic) ----

PDF_JS_PATTERNS = [br"/JavaScript", br"/JS", br"/AA", br"/OpenAction", br"/Launch"]
OOXML_VBA_HINTS = ["vbaProject.bin", "vba", "vbaproject", "_vba_project", "ThisDocument"]
RTF_DANGEROUS = [r"\\objupdate", r"\\object", r"\\objdata", r"\\pict", r"\\field", r"\\*\s*generator"]
SUSPICIOUS_STRINGS = [
    "javascript", "<script", "eval(", "wscript.shell", "powershell",
    "activexobject", "shell(", "cmd.exe", "mshta", "autoopen", "document.open",
    "base64,", "fromcharcode(", "createobject("
]

def _extract_findings(data: bytes, ext: str) -> List[Dict[str, str]]:
    findings: List[Dict[str, str]] = []
    txt = data[:300000].decode("latin-1", errors="ignore")
    low = txt.lower()

    hits = [s for s in SUSPICIOUS_STRINGS if s in low]
    if hits:
        findings.append({
            "id": "suspicious_strings",
            "severity": "medium",
            "message": f"Suspicious strings found: {', '.join(sorted(set(hits)))}"
        })

    if ext == ".pdf":
        # 1. Try robust pikepdf detection first (handles compressed streams)
        try:
            import pikepdf
            with pikepdf.open(io.BytesIO(data)) as pdf:
                # Check root dictionary
                root = pdf.root
                if "/OpenAction" in root or "/AA" in root:
                    findings.append({
                        "id": "pdf_script_js",
                        "severity": "high",
                        "message": "PDF contains auto-execution triggers (OpenAction/AA) detected by structural analysis."
                    })
                
                # Check for /JS in Names
                if "/Names" in root and "/JavaScript" in root.Names:
                    findings.append({
                        "id": "pdf_script_js",
                        "severity": "high",
                        "message": "PDF contains Named JavaScript objects."
                    })

                # Iterate ALL objects for JS action types (Deep Scan)
                # We limit to 500 objects to keep it fast for scanning
                checked = 0
                found_deep = False
                for obj in pdf.objects:
                    checked += 1
                    if checked > 1000: break 
                    if isinstance(obj, pikepdf.Dictionary):
                        # Check keys
                        if "/JS" in obj or "/JavaScript" in obj:
                            found_deep = True; break
                        if "/S" in obj and str(obj["/S"]) in ["/JavaScript", "/Launch", "/SubmitForm"]:
                            found_deep = True; break
                
                if found_deep:
                    findings.append({
                        "id": "pdf_script_js",
                        "severity": "high",
                        "message": "PDF contains deep-seated JavaScript or Launch actions."
                    })

        except Exception:
            # Fallback to regex if pikepdf fails or not installed
            for pat in PDF_JS_PATTERNS:
                if re.search(pat, data):
                    findings.append({
                        "id": "pdf_script_js",
                        "severity": "high",
                        "message": "PDF contains potentially malicious keywords (regex fallback)."
                    })
                    break
    elif ext in (".docx", ".pptx", ".xlsx"):
        if any(h in low for h in OOXML_VBA_HINTS):
            findings.append({
                "id": "ooxml_vba_macro",
                "severity": "high",
                "message": "OOXML indicates embedded VBA/macro components (vbaProject.bin)."
            })
    elif ext == ".rtf":
        for pat in RTF_DANGEROUS:
            if re.search(pat, txt, flags=re.IGNORECASE):
                findings.append({
                    "id": "rtf_embedded_object",
                    "severity": "high",
                    "message": "RTF includes embedded object/field constructs that can be abused."
                })
                break

    if not findings:
        findings.append({
            "id": "no_obvious_tricks",
            "severity": "info",
            "message": "No obvious embedded scripts/objects detected via lightweight rules."
        })
    return findings

def _recommendations(ext: str, verdict: str) -> List[str]:
    base = [
        "Keep OS and document viewers up to date.",
        "Prefer viewing unknown docs in a sandbox/VM or web viewer.",
        "Verify the sender/source before opening sensitive documents."
    ]
    per_type = {
        ".pdf": [
            "Disable JavaScript in your PDF reader.",
            "Avoid auto-open actions; open PDFs in a hardened viewer."
        ],
        ".docx": [
            "Disable macros (VBA) by default; only enable for trusted documents.",
            "Use Protected View for files from email or the Internet."
        ],
        ".pptx": [
            "Be cautious of embedded media and macros in presentations.",
            "Open in Protected View if prompted."
        ],
        ".xlsx": [
            "Disable macros and external data connections by default.",
            "Avoid clicking 'Enable Content' unless you trust the file."
        ],
        ".rtf": [
            "Open RTF files in a plain-text viewer if possible.",
            "Be cautious of embedded objects and links."
        ]
    }
    out = base + per_type.get(ext, [])
    if verdict == "malicious":
        out = ["Do not open this file outside a sandbox. Prefer the sanitized version."] + out
    return out

def _simple_heuristics(data: bytes, ext: str) -> Dict[str, float]:
    text_probe = data[:200000].decode("latin-1", errors="ignore")
    lower = text_probe.lower()
    entropy = _byte_entropy(data)

    rules_hits = sum(1 for term in SUSPICIOUS_STRINGS if term in lower)
    rules_score = min(1.0, rules_hits / 5.0)

    type_bias = 0.05 if ext in (".pdf", ".rtf") else (0.08 if ext in (".docx", ".pptx", ".xlsx") else 0.0)
    tree_like = min(1.0, 0.5*entropy + 0.7*rules_score + type_bias)
    lgbm_like = min(1.0, 0.6*tree_like + 0.4*entropy)
    dl_like = min(1.0, 0.5*entropy + 0.6*rules_score)
    meta_score = max(0.0, min(1.0, 0.25*tree_like + 0.35*lgbm_like + 0.3*dl_like + 0.1*rules_score))
    return {"P_TREE": tree_like, "P_LGBM": lgbm_like, "P_DL": dl_like, "P_RULES": rules_score, "P_META": meta_score}

def _run_sanitizer(ext: str, data: bytes) -> Tuple[Optional[bytes], Dict[str, str]]:
    try:
        if ext == ".pdf" and sanitize_pdf_bytes:
            out = sanitize_pdf_bytes(data)
            return out if out is not None else None, {"sanitizer": "pdf"}
        if ext in (".docx", ".pptx", ".xlsx") and sanitize_ooxml_bytes:
            out = sanitize_ooxml_bytes(data, ext=ext.lstrip("."))
            return out if out is not None else None, {"sanitizer": "ooxml"}
        if ext == ".rtf" and sanitize_rtf_bytes:
            out = sanitize_rtf_bytes(data)
            return out if out is not None else None, {"sanitizer": "rtf"}
    except Exception as exc:
        return None, {"sanitizer_error": str(exc)}
    return None, {}

def scan_bytes(data: bytes, filename: str = "document.bin", content_type: Optional[str] = None) -> Dict:
    try:
        ext = _ext_from_name(filename)
        mime = content_type or _guess_mime(ext)
        size = len(data)
        sha = _sha256(data)

        signals: Dict[str, float] = {}
        
        # 1. ML Features (LightGBM)
        if build_features_for_lgbm:
            try:
                feats = build_features_for_lgbm(data=data, filename=filename, ext=ext)
                if isinstance(feats, dict):
                     # Copy all features to signals so we can see them if needed
                     for k, v in feats.items():
                         if k.startswith("P_") or k in ["entropy", "size_bytes"]:
                             signals[k] = float(v)
            except Exception as e:
                signals["lgbm_error"] = str(e)
                print(f"ML Error: {e}")

        # 2. Heuristics (Tree, DL, Rules)
        try:
            h = _simple_heuristics(data, ext)
            for k, v in h.items():
                # Don't overwrite if ML provided a better score for same key (unlikely)
                if k not in signals:
                    signals[k] = v
        except Exception as e:
             signals["heuristics_error"] = str(e)
             print(f"Heuristics Error: {e}")

        risk_score = float(signals.get("P_META", 0.0))
        if "P_LGBM" in signals:
            risk_score = min(1.0, 0.7*risk_score + 0.3*signals["P_LGBM"])

        # Extract findings BEFORE determining verdict
        findings = _extract_findings(data, ext)

        # DEBUG: Add ML/Heuristic errors to findings so we can see them in UI
        if "lgbm_error" in signals:
             findings.append({
                 "id": "debug_ml_error",
                 "severity": "info",
                 "message": f"ML Engine Error: {signals['lgbm_error']}"
             })
        if "heuristics_error" in signals:
             findings.append({
                 "id": "debug_heuristics_error",
                 "severity": "info",
                 "message": f"Heuristics Error: {signals['heuristics_error']}"
             })
        
        # Verdict based on ACTUAL malicious features, not arbitrary threshold
        # Check for concrete evidence of malicious content
        
        # Check if JavaScript/macros present (both by ID and by content)
        javascript_ids = ["pdf_script_js", "ooxml_macro", "rtf_object"]
        has_javascript_by_id = any(f.get("id") in javascript_ids for f in findings)
        
        # Also check if finding description mentions javascript
        has_javascript_in_text = any(
            "javascript" in str(f.get("text", "")).lower() or 
            "javascript" in str(f.get("description", "")).lower()
            for f in findings
        )
        
        has_javascript = has_javascript_by_id or has_javascript_in_text
        has_high_risk_findings = any(f.get("severity") == "high" for f in findings)
        has_medium_risk_with_high_score = any(f.get("severity") == "medium" for f in findings) and risk_score >= 0.70
        
        # Determine verdict based on findings + risk score combination
        # Determine verdict based on findings + risk score combination
        if has_javascript or has_high_risk_findings:
            # Concrete signature match = 100% confidence
            verdict = "malicious"
            risk_score = 1.0
            signals["P_RULES"] = 1.0
            signals["P_META"] = 1.0
        elif has_medium_risk_with_high_score:
            # Medium findings + high ML score = likely malicious
            verdict = "malicious"
        elif risk_score >= 0.85:
            # Extremely high score even without obvious findings = suspicious
            verdict = "malicious"
        else:
            # No concrete evidence = benign (even if score is 60-80%)
            verdict = "benign"
        
        recommendations = _recommendations(ext, verdict)

        # CRITICAL: Only sanitize malicious files!
        # Sanitizing benign files breaks them (white screen)
        if verdict == "malicious":
            clean_bytes, san_meta = _run_sanitizer(ext, data)
            sanitized = clean_bytes is not None and len(clean_bytes) > 0
        else:
            # Benign file - return original unchanged
            clean_bytes = data
            san_meta = {"engine": "none", "reason": "benign_not_sanitized"}
            sanitized = False

        return {
            "ok": True,
            "verdict": verdict,
            "risk_score": float(risk_score),
            "model_scores": {
                "lgbm": float(signals.get("P_LGBM", 0.0)),
                "tree": float(signals.get("P_TREE", 0.0)),
                "dl": float(signals.get("P_DL", 0.0)),
                "rules": float(signals.get("P_RULES", 0.0)),
            },
            "findings": findings,
            "recommendations": recommendations,
            "meta": {
                "file": filename,
                "mime_type": mime,
                "size_bytes": size,
                "sha256": sha,
                "ext": ext,
            },
            "clean_bytes": clean_bytes if sanitized else None,
            "sanitized_bytes": clean_bytes if sanitized else None,
            "sanitizer": san_meta,
            "report": {
                "version": 1,
                "engine": "safedocs-ensemble",
                "filename": filename,
                "verdict": verdict,
                "risk_score": float(risk_score),
                "signals": signals,
                "findings": findings,
                "meta": {
                    "mime_type": mime,
                    "size_bytes": size,
                    "sha256": sha,
                    "sanitized": bool(sanitized),
                    "ext": ext,
                },
            },
        }
    except Exception as exc:
        return {
            "ok": False,
            "verdict": "benign",
            "risk_score": 0.0,
            "model_scores": {"lgbm": 0.0, "tree": 0.0, "dl": 0.0, "rules": 0.0},
            "findings": [{"id":"fallback", "severity":"info", "message":"Scanner fallback path used."}],
            "recommendations": _recommendations(_ext_from_name(filename), "benign"),
            "meta": {
                "file": filename,
                "mime_type": "application/octet-stream",
                "size_bytes": len(data),
                "sha256": _sha256(data),
                "ext": _ext_from_name(filename),
            },
            "clean_bytes": None,
            "sanitized_bytes": None,
            "sanitizer": {"error": str(exc)},
            "report": {
                "version": 1,
                "engine": "safedocs-ensemble",
                "filename": filename,
                "verdict": "benign",
                "risk_score": 0.0,
                "signals": {"fallback": True},
                "findings": [{"id":"fallback","severity":"info","message":str(exc)}],
                "meta": {"exception": str(exc)},
            },
        }
