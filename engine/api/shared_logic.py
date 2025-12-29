import hashlib
import mimetypes
import os
import tempfile
from typing import Any, Dict, List

# Sanitizers (prefer bytes versions if present; otherwise path-based)
try:
    from sanitize_pdf import sanitize_pdf_bytes as _sanitize_pdf_bytes
except Exception:
    _sanitize_pdf_bytes = None
try:
    from sanitize_pdf import sanitize_pdf as _sanitize_pdf_path
except Exception:
    _sanitize_pdf_path = None

try:
    from sanitize_ooxml import sanitize_ooxml_bytes as _sanitize_ooxml_bytes
except Exception:
    _sanitize_ooxml_bytes = None
try:
    from sanitize_ooxml import sanitize_ooxml as _sanitize_ooxml_path
except Exception:
    _sanitize_ooxml_path = None

try:
    from sanitize_rtf import sanitize_rtf_bytes as _sanitize_rtf_bytes
except Exception:
    _sanitize_rtf_bytes = None
try:
    from sanitize_rtf import sanitize_rtf as _sanitize_rtf_path
except Exception:
    _sanitize_rtf_path = None

def sha256_hash(b: bytes) -> str:
    h = hashlib.sha256()
    h.update(b)
    return h.hexdigest()

ACCEPTED_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".rtf": "application/rtf",
}

def get_extension(filename: str) -> str:
    fn = filename or ""
    dot = fn.rfind(".")
    return fn[dot:].lower() if dot != -1 else ""

def get_content_type(filename: str) -> str:
    ext = get_extension(filename)
    return ACCEPTED_TYPES.get(ext) or mimetypes.guess_type(filename)[0] or "application/octet-stream"

def sanitize_with_available_tools(ext: str, content: bytes, filename: str) -> Dict[str, Any]:
    meta: Dict[str, Any] = {}
    clean: bytes | None = None
    orig_sha = sha256_hash(content)

    # 1) bytes-style (if defined)
    try:
        if ext == ".pdf" and _sanitize_pdf_bytes:
            b = _sanitize_pdf_bytes(content)
            if isinstance(b, (bytes, bytearray)):
                clean = bytes(b); meta["engine"] = "sanitize_pdf_bytes"
        elif ext in (".docx", ".pptx", ".xlsx") and _sanitize_ooxml_bytes:
            b = _sanitize_ooxml_bytes(content, ext=ext.lstrip("."))
            if isinstance(b, (bytes, bytearray)):
                clean = bytes(b); meta["engine"] = "sanitize_ooxml_bytes"
        elif ext == ".rtf" and _sanitize_rtf_bytes:
            b = _sanitize_rtf_bytes(content)
            if isinstance(b, (bytes, bytearray)):
                clean = bytes(b); meta["engine"] = "sanitize_rtf_bytes"
    except Exception as e:
        meta["error"] = str(e)

    # 2) path-based
    if clean is None:
        with tempfile.TemporaryDirectory() as td:
            in_path  = os.path.join(td, f"in{ext or '.bin'}")
            out_path = os.path.join(td, f"out{ext or '.bin'}")
            with open(in_path, "wb") as f: f.write(content)
            try:
                res = None
                if ext == ".pdf" and _sanitize_pdf_path:
                    res = _sanitize_pdf_path(in_path, out_path); meta["engine"] = "sanitize_pdf"
                elif ext in (".docx", ".pptx", ".xlsx") and _sanitize_ooxml_path:
                    try:
                        res = _sanitize_ooxml_path(in_path, out_path)
                    except TypeError:
                        res = _sanitize_ooxml_path(in_path)
                    meta["engine"] = "sanitize_ooxml"
                elif ext == ".rtf" and _sanitize_rtf_path:
                    res = _sanitize_rtf_path(in_path, out_path); meta["engine"] = "sanitize_rtf"
                
                if isinstance(res, dict):
                    if "removed" in res: meta["removed"] = res["removed"]
                    if "notes" in res:   meta.setdefault("notes", []).extend(res["notes"])

                if os.path.exists(out_path):
                    with open(out_path, "rb") as outf:
                        clean = outf.read()
            except Exception as e:
                meta["error"] = f"path_sanitizer_error: {e}"
                if os.path.exists(out_path):
                    try:
                        with open(out_path, "rb") as outf:
                            clean = outf.read()
                    except Exception:
                        pass
                if clean is None: clean = content

    if clean is None:
        clean = content
        meta["engine"] = "passthrough"
        meta.setdefault("notes", []).append("Unsupported type or sanitizer failed; original retained")

    meta["changed"] = (sha256_hash(clean) != orig_sha)
    return {"clean_bytes": clean, "sanitizer": meta, "error": meta.get("error")}

def humanize_findings(raw_findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    nice = []
    for f in raw_findings or []:
        if not isinstance(f, dict):
            nice.append({"title": str(f), "message": "", "severity": "info", "raw": f})
            continue
        title = f.get("id") or f.get("threat_type") or f.get("title") or f.get("name") or f.get("type") or "Indicator"
        msg = f.get("message") or f.get("indicator") or f.get("description") or f.get("details") or ""
        sev = f.get("severity") or f.get("sev") or f.get("level") or "info"

        lower = (str(title) + " " + str(msg)).lower()
        explain = None
        if "vba" in lower or "macro" in lower:
            explain = "This Office document contains a VBA macro that may run code when content is enabled."
        elif "javascript" in lower or "/openaction" in lower or "/js" in lower:
            explain = "This PDF declares JavaScript or auto-run actions, often abused to execute code on open."
        elif "embedded" in lower and ("object" in lower or "file" in lower):
            explain = "Embedded object/file detected; payloads can be hidden inside embedded objects."
        elif "rtf" in lower and ("object" in lower or "field" in lower):
            explain = "RTF object/field constructs detected; these are frequently abused to launch external content."

        nice.append({
            "title": str(title),
            "message": str(msg),
            "severity": str(sev),
            "explain": explain,
            "raw": f,
        })
    return nice
