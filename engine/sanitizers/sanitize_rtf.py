from __future__ import annotations
from pathlib import Path
import re, shutil

def sanitize_rtf(in_path: Path | str, out_path: Path | str):
    """Remove object embeds and suspicious control words from RTF."""
    in_path = Path(in_path); out_path = Path(out_path)
    try:
        txt = in_path.read_text(encoding="utf-8", errors="ignore")
        # drop \object blocks and suspicious control words
        txt = re.sub(r"\\object\b.*?\\endobj", "", txt, flags=re.IGNORECASE|re.DOTALL)
        txt = re.sub(r"\\(objdata|objclass|field|pict)\b", "", txt, flags=re.IGNORECASE)
        out_path.write_text(txt, encoding="utf-8")
        return {"status":"ok","notes":["Removed RTF object blocks and embeds"]}
    except Exception:
        shutil.copy(in_path, out_path)
        return {"status":"failed","notes":["Sanitize fallback: original copied"]}
