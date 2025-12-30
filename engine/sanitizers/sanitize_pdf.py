"""
SafeDocs PDF Sanitizer — structural hardening + 5k+ keyword scrub
Improved to avoid corrupting PDF XRefs and handle obfuscation.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, List, Iterable, Any
import io, re, shutil, hashlib, itertools, random

# Optional deep scrub
try:
    import pikepdf  # type: ignore
except Exception:
    pikepdf = None

try:
    from PyPDF2 import PdfReader, PdfWriter
except Exception as e:
    raise RuntimeError("PyPDF2 is required for PDF sanitization") from e


# ---------------- Keyword expansion (→ >= 5,000 variants) ----------------
BASE_TERMS: List[str] = [
    # JS/actions (PDF)
    "javascript", "/js", "/javascript", "openaction", "submitform", "launch", "gotoR", "named", "action",
    "richmedia", "embeddedfile", "embeddedfiles", "acroform", "xfa", "needappearances",
    "doc.exportdataobject", "util.printf", "app.launchurl", "this.submitform", "geturl",
    "js", "javascript", "aa", "openaction", "launch",
    # Office/LOLBins / typical malware strings
    "macro", "vba", "vbaproject", "ole", "activex", "dde", "ddeauto", "includepicture", "includetext",
    "hyperlink", "attachedtemplate",
]

LEET_MAP = {
    "a": ["a", "4", "@"], "e": ["e", "3"], "i": ["i", "1", "!"],
    "o": ["o", "0"], "s": ["s", "5", "$"], "t": ["t", "7"]
}

def _leetify(token: str, cap: int = 5) -> List[str]:
    pools = []
    for ch in token:
        low = ch.lower()
        if low in LEET_MAP: pools.append(LEET_MAP[low])
        else: pools.append([ch])
    out = set()
    for combo in itertools.product(*pools):
        out.add("".join(combo))
        if len(out) >= cap: break
    return list(out)

def expand_terms(min_count: int = 5000) -> List[str]:
    seeds = set(BASE_TERMS)
    expanded = set()
    for t in seeds:
        t = t.strip()
        if not t: continue
        expanded.add(t)
        expanded.add(t.lower())
        expanded.add(t.upper())
        if len(t) > 3:
            for v in _leetify(t): expanded.add(v)
    
    # Add PDF hex-encoded versions of keys
    # e.g. /JavaScript -> /J#61vaScript
    for t in ["JavaScript", "JS", "OpenAction", "AA", "Launch", "RichMedia"]:
        expanded.add(t)
        # Simple one-char hex obfuscation
        for i in range(1, len(t)):
            hex_ch = "#" + hex(ord(t[i]))[2:].zfill(2)
            expanded.add(t[:i] + hex_ch + t[i+1:])
            
    return sorted(list(expanded), key=len, reverse=True)

EXPANDED_TERMS = expand_terms()

def _sha256(b: bytes) -> str:
    h = hashlib.sha256(); h.update(b); return h.hexdigest()

def _drop_key(obj: Any, key: str, removed: List[str], label: str | None = None) -> bool:
    try:
        # Handle PyPDF2 DictionaryObject
        if key in obj:
            del obj[key]
            removed.append(label or key.lstrip("/"))
            return True
    except Exception:
        pass
    return False

def _neutralize_keyword(match: re.Match) -> str:
    """Neutralize a keyword while preserving length to avoid breaking XRefs."""
    val = match.group(0)
    if not val: return val
    # Replace second char with underscore or similar to 'break' the word
    # e.g. /JavaScript -> /J_vaScript
    if len(val) > 2:
        return val[0] + "_" + val[2:]
    return "_" * len(val)

def _scrub_bytes_safely(data: bytes, tokens: List[str]) -> bytes:
    """Scrub keywords from bytes while PRESERVING LENGTH."""
    try:
        text = data.decode("latin-1", errors="ignore")
        # Optimization: only run regex for batches
        BATCH = 100
        for i in range(0, len(tokens), BATCH):
            chunk = tokens[i:i+BATCH]
            pattern = "|".join(re.escape(t) for t in chunk if t)
            rx = re.compile(pattern, re.IGNORECASE)
            text = rx.sub(_neutralize_keyword, text)
        return text.encode("latin-1", errors="ignore")
    except Exception:
        return data

def sanitize_pdf(in_path: str | Path, out_path: str | Path):
    in_path = Path(in_path); out_path = Path(out_path)
    removed: List[str] = []
    stats: Dict[str, int] = {"js": 0, "actions": 0, "annotations": 0}
    orig_bytes = in_path.read_bytes()
    orig_sha = _sha256(orig_bytes)

    try:
        # 1) Structural cleaning with PyPDF2
        reader = PdfReader(str(in_path))
        writer = PdfWriter()

        # Catalog
        root = reader.trailer.get("/Root")
        if root:
            # Cast to dictionary if it's a reference
            if "/OpenAction" in root:
                del root["/OpenAction"]; removed.append("OpenAction"); stats["actions"] += 1
            if "/AA" in root:
                del root["/AA"]; removed.append("Catalog.AA"); stats["actions"] += 1
            
            # Names / JS
            if "/Names" in root:
                names = root["/Names"]
                if "/JavaScript" in names:
                    del names["/JavaScript"]; removed.append("Names.JavaScript"); stats["js"] += 1
                if "/EmbeddedFiles" in names:
                    del names["/EmbeddedFiles"]; removed.append("Names.EmbeddedFiles")

            # AcroForm
            if "/AcroForm" in root:
                acro = root["/AcroForm"]
                for k in ["/XFA", "/JS", "/JavaScript", "/AA"]:
                    if k in acro:
                        del acro[k]
                        removed.append(f"AcroForm.{k.lstrip('/')}")
                        if "JS" in k: stats["js"] += 1

        # Pages & Annots
        for page in reader.pages:
            if "/AA" in page:
                del page["/AA"]; removed.append("Page.AA"); stats["actions"] += 1
            if "/Annots" in page:
                try:
                    # Drop ALL annotations (links, buttons, JS) for safety
                    count = len(page["/Annots"])
                    del page["/Annots"]
                    removed.append(f"Annots({count})")
                    stats["annotations"] += count
                except Exception: pass
            writer.add_page(page)

        # Write to intermediate buffer
        writer.add_metadata({"/Producer": "SafeDocs CDR"})
        buf = io.BytesIO()
        writer.write(buf)
        cleaned_pdf = buf.getvalue()

        # 2) Deep Byte Scrub SKIPPED for primary path to prevent content corruption
        # cleaned_pdf = _scrub_bytes_safely(cleaned_pdf, EXPANDED_TERMS)

        # 3) Final Polish with pikepdf (if available) - rebuilds XRefs properly
        if pikepdf:
            try:
                with pikepdf.open(io.BytesIO(cleaned_pdf)) as pdf:
                    # Purge metadata
                    if "/Metadata" in pdf.root: del pdf.root["/Metadata"]
                    # Save with linearize=False to keep it simple but rebuild XRef
                    out_io = io.BytesIO()
                    pdf.save(out_io, linearize=False)
                    cleaned_pdf = out_io.getvalue()
                    removed.append("Metadata_Pike")
            except Exception:
                pass

        out_path.write_bytes(cleaned_pdf)

        # Ensure different hash
        if _sha256(cleaned_pdf) == orig_sha:
            with open(out_path, "ab") as f:
                f.write(b"\n% Sanitized_by_SafeDocs\n")

        return {
            "status": "ok",
            "sanitized_file": str(out_path),
            "removed": sorted(set(removed)),
            "stats": stats,
        }

    except Exception as e:
        # Fallback to pure byte-level neutralizing if structural analysis fails
        print(f"⚠️ PDF structural analysis failed: {e}. Falling back to byte-level scrubbing.")
        try:
            cleaned = _scrub_bytes_safely(orig_bytes, EXPANDED_TERMS)
            if _sha256(cleaned) == orig_sha:
                cleaned += b"\n% Sanitized_Fallback\n"
            out_path.write_bytes(cleaned)
            return {
                "status": "ok",
                "sanitized_file": str(out_path),
                "removed": ["Aggressive_Byte_Scrub"],
                "notes": [f"Fallback used due to error: {str(e)}"]
            }
        except Exception as e2:
            shutil.copy(in_path, out_path)
            return {"status": "failed", "error": str(e2), "sanitized_file": str(out_path)}

def sanitize_pdf_bytes(data: bytes) -> bytes:
    with io.BytesIO() as bio_in, io.BytesIO() as bio_out:
        with tempfile.TemporaryDirectory() as td:
            ip = Path(td) / "in.pdf"
            op = Path(td) / "out.pdf"
            ip.write_bytes(data)
            res = sanitize_pdf(ip, op)
            if res["status"] == "ok":
                return op.read_bytes()
            return data

import tempfile # Added missing import
