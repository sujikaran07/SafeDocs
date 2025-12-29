#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
SafeDocs Predict-Only CLI (no dataset scan, no training)
- Loads saved model + feature columns
- Extracts features for ONE file and prints a JSON verdict
- NEW: Guesses file type if extension is missing

Usage:
  python predict_only.py --file "E:/path/to/file.docx"
  python predict_only.py --model-dir "E:/.../safedocs_dataset/models" --file "E:/file.pdf"
"""

from __future__ import annotations
import os, sys, subprocess, struct, json, math, re, io, zipfile
from pathlib import Path
from collections import Counter
from typing import Dict, List

# ----- Optional: reuse/create a local venv so this runs anywhere -----
def _venv_python(venv_dir: Path) -> Path:
    return venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python3")

def _ensure_64bit():
    if os.name == "nt" and (struct.calcsize("P") * 8 != 64):
        print("[ERROR] 32-bit Python detected. Install 64-bit Python.", file=sys.stderr)
        sys.exit(2)

def _maybe_bootstrap():
    try:
        if os.environ.get("VIRTUAL_ENV"):
            return
    except Exception:
        pass
    here = Path(__file__).resolve().parent
    venv_dir = here / ".venv"
    vpy = _venv_python(venv_dir)
    if venv_dir.exists() and vpy.exists():
        if Path(sys.executable).resolve() != vpy.resolve():
            os.execv(str(vpy), [str(vpy)] + sys.argv)
        return
    print("[Bootstrap] Creating local .venv for inference ...")
    subprocess.check_call([sys.executable, "-m", "venv", str(venv_dir)])
    vpy = _venv_python(venv_dir)
    print("[Bootstrap] Installing minimal wheels ...")
    def _pip(*args): subprocess.check_call([str(vpy), "-m", "pip", *args])
    _pip("install", "--upgrade", "pip", "setuptools", "wheel")
    _pip("install", "--only-binary=:all:", "--prefer-binary",
         "numpy", "pandas", "scikit-learn", "lightgbm", "joblib")
    os.execv(str(vpy), [str(vpy)] + sys.argv)

_ensure_64bit()
_maybe_bootstrap()

# ----- Third-party imports -----
import numpy as np
import pandas as pd
import joblib
import argparse

SUPPORTED_EXTS = {".pdf", ".docx", ".xlsx", ".pptx", ".rtf", ".xls"}
MAX_BYTES = 6_000_000

# ===== Feature extraction =====
OFFICE_SUSP_TOKENS = [
    b"CreateObject", b"Shell", b"WScript", b"URLDownloadToFile",
    b"ADODB.Stream", b"WinExec", b"cmd.exe", b"PowerShell", b"Msxml2.XMLHTTP"
]
PDF_TOKENS = {
    "has_js": [b"/JS", b"/JavaScript"],
    "has_openaction": [b"/OpenAction", b"/AA"],
}

def safe_read_bytes(p: Path, max_bytes=MAX_BYTES) -> bytes:
    try:
        with open(p, "rb") as f:
            return f.read(max_bytes)
    except Exception:
        return b""

def entropy(b: bytes) -> float:
    if not b: return 0.0
    cnt = Counter(b); n = len(b); e = 0.0
    for c in cnt.values():
        p = c / n
        if p: e -= p * math.log2(p)
    return float(e)

def chunk_entropy_p95(b: bytes, chunk=4096) -> float:
    if not b: return 0.0
    vals = [entropy(b[i:i+chunk]) for i in range(0, len(b), chunk)]
    return float(np.percentile(vals, 95)) if vals else 0.0

def count_urls_text(text: str) -> int:
    return len(re.findall(r"https?://[^\s\\]+", text, flags=re.IGNORECASE))

def is_ole_cfb(b: bytes) -> bool:
    return b.startswith(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1")

def ext_onehots(ext: str) -> Dict[str, int]:
    feats = {f"ext_is_{e.strip('.')}": 0 for e in SUPPORTED_EXTS}
    if ext in SUPPORTED_EXTS:
        feats[f"ext_is_{ext.strip('.')}"] = 1
    return feats

def extract_features_ooxml(data: bytes) -> Dict[str, float]:
    feats = {
        "vba_module_count": 0, "has_activex": 0, "ole_object_count": 0,
        "macro_size": 0, "macro_entropy_p95": 0.0,
        "token_CreateObject": 0, "token_Shell": 0, "token_WScript": 0,
        "url_count": 0, "zip_member_count": 0,
    }
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            members = z.namelist()
            feats["zip_member_count"] = len(members)
            macro_bytes = b""
            for name in members:
                ln = name.lower()
                if ln.endswith("vba/vba.pcode") or ln.endswith("vbaproject.bin") or "/vba" in ln or "vbaproject" in ln:
                    try: macro_bytes += z.read(name)
                    except: pass
                if any(ln.startswith(p) for p in ["word/embeddings/", "ppt/embeddings/", "xl/embeddings/"]):
                    feats["ole_object_count"] += 1
                if ("activex" in ln) or ("control" in ln): feats["has_activex"] = 1
                if ln.endswith((".xml", ".rels", ".vml")):
                    try:
                        xmlb = z.read(name)
                        feats["token_CreateObject"] += int(xmlb.count(b"CreateObject"))
                        feats["token_Shell"] += int(xmlb.count(b"Shell"))
                        feats["token_WScript"] += int(xmlb.count(b"WScript"))
                        text = xmlb.decode("utf-8", errors="ignore")
                        feats["url_count"] += count_urls_text(text)
                        if ("classid" in text.lower()) or ("activex" in text.lower()):
                            feats["has_activex"] = 1
                    except: pass
            if macro_bytes:
                feats["macro_size"] = len(macro_bytes)
                feats["macro_entropy_p95"] = chunk_entropy_p95(macro_bytes, 2048)
                feats["vba_module_count"] = int(macro_bytes.count(b"Attribute VB_Name"))
    except:
        pass
    return feats

def extract_features_pdf(data: bytes) -> Dict[str, float]:
    feats = {
        "pdf_has_js": 0, "pdf_has_openaction": 0,
        "pdf_uri_count": 0, "pdf_embedded_file_count": 0,
        "pdf_object_count": 0, "pdf_stream_count": 0, "pdf_xref_count": 0,
        "pdf_entropy_p95": 0.0,
    }
    if not data.startswith(b"%PDF"):
        return feats
    feats["pdf_has_js"] = int(any(tok in data for tok in PDF_TOKENS["has_js"]))
    feats["pdf_has_openaction"] = int(any(tok in data for tok in PDF_TOKENS["has_openaction"]))
    feats["pdf_uri_count"] = int(data.count(b"/URI") + data.count(b"/GoToR"))
    feats["pdf_embedded_file_count"] = int(data.count(b"/EmbeddedFile") + data.count(b"/EmbeddedFiles"))
    feats["pdf_object_count"] = int(data.count(b" obj"))
    feats["pdf_stream_count"] = int(data.count(b"stream"))
    feats["pdf_xref_count"] = int(data.count(b"xref"))
    feats["pdf_entropy_p95"] = chunk_entropy_p95(data, 4096)
    return feats

def extract_features_rtf(data: bytes) -> Dict[str, float]:
    feats = {
        "rtf_objdata_count": 0, "rtf_object_count": 0, "rtf_field_count": 0, "rtf_pict_count": 0,
        "rtf_link_count": 0, "rtf_url_count": 0, "rtf_js_like": 0, "rtf_shell_like": 0,
        "rtf_entropy_p95": 0.0, "rtf_has_ole_packager_hint": 0,
    }
    if not data.strip().startswith(b"{\\rtf"):
        return feats
    feats["rtf_objdata_count"] = int(data.count(b"\\objdata"))
    feats["rtf_object_count"] = int(data.count(b"\\object"))
    feats["rtf_field_count"] = int(data.count(b"\\field"))
    feats["rtf_pict_count"] = int(data.count(b"\\pict"))
    feats["rtf_link_count"] = int(data.count(b"\\link"))
    feats["rtf_js_like"] = int(b"javascript" in data.lower())
    feats["rtf_shell_like"] = int(b"shell" in data.lower() or b"cmd.exe" in data.lower())
    try: text = data.decode("latin-1", errors="ignore")
    except: text = ""
    feats["rtf_url_count"] = count_urls_text(text)
    if b"\\objdata" in data and (b"Package" in data or b"D0CF" in data.upper()):
        feats["rtf_has_ole_packager_hint"] = 1
    feats["rtf_entropy_p95"] = chunk_entropy_p95(data, 4096)
    return feats

def extract_features_xls_ole(data: bytes) -> Dict[str, float]:
    feats = {"xls_is_ole": int(is_ole_cfb(data)), "xls_has_vba_hint": 0, "xls_vba_token_count": 0}
    if feats["xls_is_ole"]:
        feats["xls_has_vba_hint"] = int(b"VBA" in data)
        feats["xls_vba_token_count"] = int(data.count(b"VBA") + data.count(b"Attribute VB_Name"))
    return feats

def extract_features_for_file(path: Path, ext: str) -> Dict[str, float]:
    data = safe_read_bytes(path, MAX_BYTES)
    feats = {
        "file_size": path.stat().st_size if path.exists() else len(data),
        "entropy_p95": chunk_entropy_p95(data, 4096),
        "suspicious_token_count": int(sum(data.count(tok) for tok in OFFICE_SUSP_TOKENS)),
        "url_count_general": 0,
    }
    try: text = data.decode("utf-8", errors="ignore")
    except: text = ""
    feats["url_count_general"] = count_urls_text(text)
    feats.update(ext_onehots(ext))
    if ext in {".docx", ".xlsx", ".pptx"}:
        feats.update(extract_features_ooxml(data))
    elif ext == ".pdf":
        feats.update(extract_features_pdf(data))
    elif ext == ".rtf":
        feats.update(extract_features_rtf(data))
    elif ext == ".xls":
        feats.update(extract_features_xls_ole(data))
    return feats

def two_col_proba(estimator, X: np.ndarray) -> np.ndarray:
    P = estimator.predict_proba(X)
    if P.ndim == 1: P = P.reshape(-1, 1)
    if P.shape[1] == 2: return P
    pos = np.clip(P[:, 0], 0.0, 1.0)
    return np.stack([1 - pos, pos], axis=1)

def derive_tags_and_severity(feats: Dict[str, float], prob: float):
    tags = []
    if feats.get("vba_module_count", 0) > 0 or feats.get("macro_size", 0) > 0: tags.append("VBA macros detected")
    if feats.get("has_activex", 0) > 0: tags.append("ActiveX controls")
    if feats.get("ole_object_count", 0) > 0 or feats.get("rtf_has_ole_packager_hint", 0) > 0: tags.append("Embedded OLE objects")
    if feats.get("token_CreateObject", 0) > 0 or feats.get("token_Shell", 0) > 0 or feats.get("token_WScript", 0) > 0: tags.append("Suspicious automation APIs")
    if feats.get("pdf_has_js", 0) > 0: tags.append("PDF JavaScript")
    if feats.get("pdf_has_openaction", 0) > 0: tags.append("Auto-execute action")
    total_urls = feats.get("url_count", 0) + feats.get("url_count_general", 0) + feats.get("pdf_uri_count", 0) + feats.get("rtf_url_count", 0)
    if total_urls > 10: tags.append("Unusually many links")
    elif total_urls > 0: tags.append("Contains links")
    sev = float(prob)
    if any(t in tags for t in ["Auto-execute action","PDF JavaScript","ActiveX controls"]): sev = min(1.0, sev + 0.2)
    if "VBA macros detected" in tags: sev = min(1.0, sev + 0.1)
    if "Embedded OLE objects" in tags: sev = min(1.0, sev + 0.1)
    severity = int(round(sev * 100))
    sanitize = severity >= 40 or any(t in tags for t in ["VBA macros detected","PDF JavaScript","Embedded OLE objects"])
    return tags, severity, sanitize

# ---- Type guessing for files with NO extension ----
def guess_ext_from_bytes(path: Path) -> str | None:
    b = safe_read_bytes(path, 32 * 1024)
    if b.startswith(b"%PDF"): return ".pdf"
    if b.strip().startswith(b"{\\rtf"): return ".rtf"
    if b[:8] == b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1": return ".xls"  # OLE CFB
    # Try OOXML (zip with content types)
    try:
        with zipfile.ZipFile(path) as z:
            names = set(z.namelist())
            if "[Content_Types].xml" in names:
                if any(n.startswith("word/") for n in names): return ".docx"
                if any(n.startswith("xl/") for n in names): return ".xlsx"
                if any(n.startswith("ppt/") for n in names): return ".pptx"
                return ".docx"
    except Exception:
        pass
    return None

# ===== CLI =====
def autodetect_model_dir(cli: str | None) -> Path:
    if cli:
        p = Path(cli).resolve()
        if not p.exists(): raise SystemExit(f"[ERROR] --model-dir not found: {p}")
        return p
    here = Path(__file__).resolve().parent
    candidates = [
        here / "models",
        here / "safedocs_dataset" / "models",
        here.parent / "safedocs_dataset" / "models",
    ]
    for c in candidates:
        if c.exists() and c.is_dir():
            return c
    raise SystemExit("[ERROR] Could not find models directory. Pass --model-dir.")

def main():
    ap = argparse.ArgumentParser(description="SafeDocs predict-only CLI")
    ap.add_argument("--file", required=True, help="Path to a single file (.pdf/.docx/.xlsx/.pptx/.rtf/.xls)")
    ap.add_argument("--model-dir", default=None, help="Folder containing lightgbm_calibrated.pkl and feature_cols.json")
    args = ap.parse_args()

    fpath = Path(args.file).resolve()
    if not fpath.exists():
        raise SystemExit(f"[ERROR] File not found: {fpath}. If the path contains spaces, keep it in quotes.")
    ext = fpath.suffix.lower()

    if ext == "":
        guessed = guess_ext_from_bytes(fpath)
        if guessed:
            ext = guessed
        else:
            raise SystemExit("[ERROR] Unsupported extension: file has no extension and type could not be guessed. "
                             "Rename with a proper extension like .pdf/.docx/.xlsx/.pptx/.rtf/.xls.")

    if ext not in SUPPORTED_EXTS:
        raise SystemExit(f"[ERROR] Unsupported extension: {ext}. Supported: {', '.join(sorted(SUPPORTED_EXTS))}")

    mdir = autodetect_model_dir(args.model_dir)
    bundle_path = mdir / "lightgbm_calibrated.pkl"
    cols_path = mdir / "feature_cols.json"
    if not bundle_path.exists() or not cols_path.exists():
        raise SystemExit(f"[ERROR] Missing model artifacts in {mdir}")

    bundle = joblib.load(bundle_path)
    feature_cols: List[str] = json.loads(cols_path.read_text(encoding="utf-8"))
    predictor = bundle.get("calibrator") or bundle["model"]

    feats = extract_features_for_file(fpath, ext)
    feats_aligned = {c: feats.get(c, -1) for c in feature_cols}
    X = pd.DataFrame([feats_aligned])[feature_cols].values
    prob = float(two_col_proba(predictor, X)[:, 1][0])
    pred = int(prob >= 0.5)
    tags, severity, sanitize = derive_tags_and_severity(feats, prob)
    out = {
        "file": str(fpath),
        "prediction": pred,
        "prob_malicious": prob,
        "severity_0_100": severity,
        "sanitize_recommended": sanitize,
        "tags": tags,
        "explanations": {k: feats.get(k, -1) for k in [
            "vba_module_count","has_activex","ole_object_count","macro_size",
            "pdf_has_js","pdf_has_openaction","suspicious_token_count"
        ]}
    }
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
