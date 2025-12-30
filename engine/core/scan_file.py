# scan_file.py
# Production-Grade Scan Controller
# Architecture: Rules decide -> ML supports -> Sanitizer rebuilds (if malicious)

from __future__ import annotations
import hashlib
import io
import math
import os
import re
from typing import Dict, List, Optional, Tuple

# Optional deps
try:
    from features_runtime import build_features_for_lgbm
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

# ---- Constants & Patterns (Deterministic Rules) ----

SUSPICIOUS_STRINGS = [
    "javascript", "<script", "eval(", "wscript.shell", "powershell",
    "activexobject", "shell(", "cmd.exe", "mshta", "autoopen", "document.open",
    "base64,", "fromcharcode(", "createobject("
]

PDF_JS_PATTERNS = [br"/JavaScript", br"/JS", br"/Launch", br"/OpenAction", br"/AA"]
OOXML_VBA_HINTS = ["vbaProject.bin", "vba", "vbaproject", "_vba_project", "ThisDocument"]
RTF_DANGEROUS = [r"\\objupdate", r"\\object", r"\\objdata", r"\\pict", r"\\field", r"\\*\s*generator"]

def _sha256(data: bytes) -> str:
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()

def _ext_from_name(name: str) -> str:
    if not name: return ""
    return os.path.splitext(name)[1].lower().strip()

def _guess_mime(ext: str) -> str:
    return {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".rtf": "application/rtf",
    }.get(ext, "application/octet-stream")

# ---- Phase 1: Feature Extraction & Rule Matching ----

def _run_rules(data: bytes, ext: str, features: Dict[str, float]) -> Tuple[float, List[Dict[str, str]]]:
    """
    Returns a normalized Rule Score [0.0 - 1.0] and a list of specific findings.
    """
    rule_points = 0
    findings = []
    
    # 1. Text Analysis
    txt = data[:300000].decode("latin-1", errors="ignore")
    low = txt.lower()
    
    hits = [s for s in SUSPICIOUS_STRINGS if s in low]
    if hits:
        rule_points += 15
        findings.append({
            "id": "suspicious_strings",
            "severity": "medium",
            "message": f"Suspicious strings found: {', '.join(sorted(set(hits))[:5])}"
        })

    # 2. PDF Specific Deep Scan
    if ext == ".pdf":
        try:
            import pikepdf
            with pikepdf.open(io.BytesIO(data)) as pdf:
                root = pdf.root
                # Critical: Launch Actions (Execution)
                if "/OpenAction" in root:
                    oa = root["/OpenAction"]
                    if isinstance(oa, pikepdf.Dictionary) and "/S" in oa:
                        subtype = str(oa["/S"])
                        if subtype in ["/Launch", "/SubmitForm", "/ImportData"]:
                            rule_points += 80 # Critical
                            findings.append({"id": "pdf_exploit_action", "severity": "critical", "message": f"PDF Auto-Launch Action detected ({subtype})."})
                        elif subtype == "/JavaScript":
                            rule_points += 50
                            findings.append({"id": "pdf_js_auto", "severity": "high", "message": "PDF OpenAction executes JavaScript."})

                if "/AA" in root: 
                    rule_points += 40
                    findings.append({"id": "pdf_aa_action", "severity": "high", "message": "PDF contains global Auto-Actions (AA)."})

                # JS in Names
                if "/Names" in root and "/JavaScript" in root.Names:
                    rule_points += 50
                    findings.append({"id": "pdf_names_js", "severity": "high", "message": "PDF contains named JavaScript scripts."})

                # Deep Scan for /Launch or /JS in objects
                deep_threat = False
                checked = 0
                for obj in pdf.objects:
                    checked += 1
                    if checked > 600: break # Perf limit
                    if isinstance(obj, pikepdf.Dictionary):
                        if "/S" in obj and str(obj["/S"]) == "/Launch":
                            deep_threat = True; break
                        if "/JS" in obj or "/JavaScript" in obj:
                            deep_threat = True; break
                
                if deep_threat:
                    rule_points += 60
                    findings.append({"id": "pdf_deep_js", "severity": "high", "message": "Hidden JavaScript/Launch actions found in objects."})

        except ImportError:
            findings.append({"id": "err_dep_missing", "severity": "warning", "message": "pikepdf not installed - deep scan skipped"})
        except Exception:
            # Fallback to Regex
            for pat in PDF_JS_PATTERNS:
                if re.search(pat, data):
                    rule_points += 40
                    findings.append({"id": "pdf_regex_match", "severity": "medium", "message": "PDF raw structure matches script patterns."})
                    break

    # 3. Office Macro Check
    elif ext in (".docx", ".docm", ".xlsm", ".pptm", ".pptx", ".xlsx"):
        has_vba = features.get("has_vba_project", 0.0) == 1.0
        if has_vba:
            rule_points += 70
            findings.append({"id": "office_macro", "severity": "high", "message": "Office document contains VBA Macros (vbaProject.bin)."})
        
        if features.get("embedded_ole_count", 0) > 0:
            rule_points += 20
            findings.append({"id": "office_ole", "severity": "medium", "message": "Office document contains embedded OLE objects."})

    # 4. RTF Check
    elif ext == ".rtf":
        for pat in RTF_DANGEROUS:
            if re.search(pat, txt, flags=re.IGNORECASE):
                rule_points += 70
                findings.append({"id": "rtf_exploit", "severity": "high", "message": "RTF contains potentially malicious control words."})
                break

    # 5. Entropy Heuristic
    entropy = features.get("entropy", 0.0)
    if entropy > 7.2:
        rule_points += 20
        findings.append({"id": "high_entropy", "severity": "medium", "message": f"High entropy ({entropy:.2f}) indicates packed/encrypted content."})

    normalized_score = min(rule_points / 100.0, 1.0)
    return normalized_score, findings


def _run_sanitizer(ext: str, data: bytes) -> Tuple[Optional[bytes], Dict[str, str]]:
    """
    Sanitize only runs if verdict is MALICIOUS.
    """
    try:
        clean_bytes = None
        info = {}

        if ext == ".pdf" and sanitize_pdf_bytes:
            clean_bytes = sanitize_pdf_bytes(data)
            info = {"engine": "pdf_strip"}
        
        elif ext in (".docx", ".pptx", ".xlsx") and sanitize_ooxml_bytes:
            clean_bytes = sanitize_ooxml_bytes(data, ext=ext.lstrip("."))
            info = {"engine": "ooxml_purge"}
            
        elif ext == ".rtf" and sanitize_rtf_bytes:
            clean_bytes = sanitize_rtf_bytes(data)
            info = {"engine": "rtf_convert"}
            
        else:
            info = {"engine": "none", "reason": "no_sanitizer_available"}

        # Validate sanitization result
        if clean_bytes and len(clean_bytes) > 0:
            return clean_bytes, info
        return None, {"error": "Sanitizer produced empty output"}

    except Exception as e:
        return None, {"error": str(e)}

# ---- Main Entry Point ----

def scan_bytes(data: bytes, filename: str = "doc.bin", content_type: Optional[str] = None) -> Dict:
    ext = _ext_from_name(filename)
    mime = content_type or _guess_mime(ext)
    filesize = len(data)
    file_sha = _sha256(data)

    # 1. Extract Features (Deterministic)
    ml_signals = {}
    features = {}
    if build_features_for_lgbm:
        raw_feats = build_features_for_lgbm(data=data, filename=filename, ext=ext)
        if "error" not in raw_feats:
            # Flatten for Rule Engine usage
            features = raw_feats
            # Keep ML probability separate
            ml_signals["P_LGBM"] = raw_feats.get("P_LGBM", 0.0)
        else:
            ml_signals["error"] = raw_feats["error"]

    # 2. Run Rules (Deterministic)
    rule_score, findings = _run_rules(data, ext, features)
    
    # 3. Decision Logic (Golden Rule: Rules > ML)
    # ML Support
    ml_prob = ml_signals.get("P_LGBM", 0.0)
    
    # Composite Score (Max of Rule or ML)
    # We trust rules implicitly. We trust ML if it's confident.
    risk_score = max(rule_score, ml_prob)
    
    verdict = "benign"
    
    # CRITICAL FINDINGS overrides everything
    has_critical = any(f["severity"] == "critical" for f in findings)
    
    if has_critical:
        verdict = "malicious"
        risk_score = 1.0
    elif rule_score >= 0.60:
        verdict = "malicious"
    elif rule_score >= 0.30:
        verdict = "suspicious"
    # Fallback to ML if Rules are quiet
    elif ml_prob >= 0.75:
         verdict = "malicious"
    elif ml_prob >= 0.50:
         verdict = "suspicious"
    else:
         verdict = "benign"

    # 4. Sanitization (Rebuild Phase)
    # ONLY sanitize if malicious. Modifying benign files is unsafe/unnecessary.
    clean_bytes = None
    san_meta = {}
    
    if verdict == "malicious":
        clean_bytes, san_meta = _run_sanitizer(ext, data)
        sanitized = (clean_bytes is not None)
    else:
        sanitized = False
        san_meta = {"reason": "verdict_not_malicious"}

    # 5. Recommendation
    recs = []
    if verdict == "malicious":
        recs.append("Do not open this file on a production workstation.")
        recs.append("Use the sanitized version if available.")
    if "office_macro" in str(findings):
        recs.append("Disable Macros in Microsoft Office Trust Center.")
    if "pdf_js" in str(findings):
        recs.append("Disable JavaScript in your PDF Viewer.")

    # 6. Final Report
    return {
        "ok": True,
        "verdict": verdict,
        "risk_score": float(risk_score),
        "model_scores": {
            "rules": float(rule_score),
            "lgbm": float(ml_prob),
            # UI Compat: Map 'tree' and 'dl' to prevent 0% empty bars.
            # 'tree' -> LightGBM is a tree ensemble, so we map it there.
            # 'dl' -> Maps to our composite Deep Analysis score (risk_score).
            "tree": float(ml_prob),
            "dl": float(risk_score),
            "composite": float(risk_score)
        },
        "findings": findings,
        "recommendations": recs,
        "meta": {
            "filename": filename,
            "mime": mime,
            "size": filesize,
            "sha256": file_sha,
            "ext": ext
        },
        "clean_bytes": clean_bytes,
        "sanitized_bytes": clean_bytes, # Legacy key support
        "sanitizer": san_meta,
        # Legacy 'report' structure for UI compatibility if needed
        "report": {
            "verdict": verdict,
            "risk_score": risk_score,
            "findings": findings,
            "signals": {"P_RULES": rule_score, "P_LGBM": ml_prob}
        }
    }
