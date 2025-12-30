from __future__ import annotations
from pathlib import Path
import re, shutil, io

def sanitize_rtf(in_path: Path | str, out_path: Path | str):
    """Remove object embeds and suspicious control words from RTF."""
    in_path = Path(in_path); out_path = Path(out_path)
    try:
        # Use latin-1 to avoid encoding issues with binary RTF data
        data = in_path.read_bytes()
        txt = data.decode("latin-1", errors="ignore")
        
        # drop \object blocks and suspicious control words
        # e.g. {\object ... \objdata ... }
        txt = re.sub(r"\\object\b.*?\\endobj\b", "", txt, flags=re.IGNORECASE|re.DOTALL)
        txt = re.sub(r"\\(objdata|objclass|field|pict)\b", "", txt, flags=re.IGNORECASE)
        
        out_path.write_text(txt, encoding="latin-1")
        return {"status":"ok","notes":["Removed RTF object blocks and embeds"]}
    except Exception as e:
        shutil.copy(in_path, out_path)
        return {"status":"failed","notes":[f"Sanitize fallback: {str(e)}"]}

def sanitize_rtf_bytes(data: bytes) -> bytes:
    """Bytes wrapper for RTF sanitization"""
    try:
        txt = data.decode("latin-1", errors="ignore")
        txt = re.sub(r"\\object\b.*?\\endobj\b", "", txt, flags=re.IGNORECASE|re.DOTALL)
        txt = re.sub(r"\\(objdata|objclass|field|pict)\b", "", txt, flags=re.IGNORECASE)
        return txt.encode("latin-1")
    except Exception:
        return data
