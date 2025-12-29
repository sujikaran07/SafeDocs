# scripts/features_runtime.py
from pathlib import Path
import magic, zipfile

def sniff_meta(path: Path):
    m = magic.from_file(str(path), mime=True)
    meta = {"mime": m, "pages": 0}
    if "pdf" in m:
        data = path.read_bytes()
        meta["pdf_has_javascript"] = any(x in data for x in [b"/JavaScript", b"/OpenAction", b"/AA", b"/Launch"])
        try:
            import pikepdf
            with pikepdf.open(path) as pdf:
                meta["pages"] = len(pdf.pages)
        except:
            pass
    elif zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as z:
            names = z.namelist()
            meta["has_vba_project"] = any(n.endswith("vbaProject.bin") for n in names)
            meta["embedded_ole_count"] = sum(1 for n in names if "/embeddings/" in n)
    return meta

def build_features_for_lgbm(path: Path, feat_order: list):
    """
    Create a dict with keys matching feature_cols.json (unknown keys -> 0.0).
    Non-numeric values are discarded.
    """
    meta = sniff_meta(path)
    size = path.stat().st_size
    # Base numeric features
    f = {
        "size_bytes": float(size),
        "pdf_has_javascript": 1.0 if meta.get("pdf_has_javascript") else 0.0,
        "has_vba_project": 1.0 if meta.get("has_vba_project") else 0.0,
        "embedded_ole_count": float(meta.get("embedded_ole_count", 0)),
        "page_count": float(meta.get("pages", 0)),
    }

    # Build final dict in required order, force numeric only
    clean = {}
    for k in feat_order:
        v = f.get(k, 0.0)
        try:
            clean[k] = float(v)
        except Exception:
            clean[k] = 0.0  # fallback if it’s a string
    return clean, meta
