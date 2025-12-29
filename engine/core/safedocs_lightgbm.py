#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
SafeDocs LightGBM ML Pipeline (self-bootstrapping, wheels-only, path-agnostic, robust eval)

What this single file does:
  • Creates a local virtual environment (.venv) next to this file, if missing
  • Upgrades pip/setuptools/wheel
  • Installs required packages using binary wheels only (no compiling)
      - On Python 3.13+, prefers latest wheels (unpinned)
      - On older Pythons, falls back to pinned versions with broad wheel support
  • Auto-detects your dataset root if you don’t pass --data-root
    (probes E:\SafeDocs_Datasets_ML and other common locations)
  • Builds manifest & 70/15/15 splits, extracts features, trains LightGBM, optionally calibrates, evaluates
  • Handles single-class splits safely (no IndexError), and skips calibration if val is single-class
  • Optional: analyze a single file after training with --predict

Usage:
  python safedocs_lightgbm.py
  python safedocs_lightgbm.py --data-root "E:/SafeDocs_Datasets_ML"
  python safedocs_lightgbm.py --predict "E:/path/to/suspect.docx"
"""

from __future__ import annotations

# ---------------------------
# Phase 0: stdlib-only bootstrap (venv + pip install + dataset autodetect)
# ---------------------------
import argparse
import os
import sys
import subprocess
import struct
from pathlib import Path
import re
import io
import json
import math
import shutil
import hashlib
from collections import Counter
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# ---- Two install plans ----
FALLBACK_PINNED = {  # broad wheel coverage for Python 3.9–3.12
    "numpy": "1.26.4",
    "pandas": "2.1.4",
    "scikit-learn": "1.3.2",
    "lightgbm": "4.1.0",
    "tqdm": "4.66.5",
    "joblib": "1.3.2",
}
UNPINNED = ["numpy", "pandas", "scikit-learn", "lightgbm", "tqdm", "joblib"]  # best for 3.13+

SUPPORTED_EXTS = {".pdf", ".docx", ".xlsx", ".pptx", ".rtf", ".xls"}
RANDOM_STATE = 42

OFFICE_SUSP_TOKENS = [
    b"CreateObject", b"Shell", b"WScript", b"URLDownloadToFile",
    b"ADODB.Stream", b"WinExec", b"cmd.exe", b"PowerShell", b"Msxml2.XMLHTTP"
]
PDF_TOKENS = {
    "has_js": [b"/JS", b"/JavaScript"],
    "has_openaction": [b"/OpenAction", b"/AA"],
    "has_launch": [b"/Launch"],
    "uri_tokens": [b"/URI", b"/GoToR"],
    "embedded_file_tokens": [b"/EmbeddedFile", b"/EmbeddedFiles"],
}

def _venv_python(venv_dir: Path) -> Path:
    return venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python3")

def _ensure_64bit_or_exit():
    if os.name == "nt" and (struct.calcsize("P") * 8 != 64):
        print("\n[ERROR] 32-bit Python detected on Windows.")
        print("Scientific wheels (numpy/pandas/sklearn) need 64-bit Python.")
        print("Install Python 3.11 or 3.12 **x64** from python.org and rerun.\n")
        sys.exit(2)

def _ensure_venv_and_reexec():
    script_dir = Path(__file__).resolve().parent
    venv_dir = script_dir / ".venv"
    vpy = _venv_python(venv_dir)
    try:
        if Path(sys.executable).resolve() == vpy.resolve():
            return
    except Exception:
        pass
    if not venv_dir.exists():
        print("[Bootstrap] Creating local virtual environment (.venv)...")
        subprocess.check_call([sys.executable, "-m", "venv", str(venv_dir)])
    print("[Bootstrap] Re-launching inside .venv ...")
    os.execv(str(vpy), [str(vpy)] + sys.argv)

def _pip(*args):
    return subprocess.check_call([sys.executable, "-m", "pip", *args])

def _install_unpinned_wheels():
    _pip("install", "--upgrade", "pip", "setuptools", "wheel")
    _pip("install", "--only-binary=:all:", "--prefer-binary", *UNPINNED)

def _install_fallback_pinned():
    _pip("install", "--upgrade", "pip", "setuptools", "wheel")
    reqs = [f"{k}=={v}" for k, v in FALLBACK_PINNED.items()]
    _pip("install", "--only-binary=:all:", "--prefer-binary", *reqs)

def _ensure_dependencies():
    print("[Bootstrap] Ensuring required packages (binary wheels only) ...")
    _ensure_64bit_or_exit()
    py_maj, py_min = sys.version_info[:2]
    try:
        if (py_maj, py_min) >= (3, 13):
            _install_unpinned_wheels()
        else:
            try:
                _install_unpinned_wheels()
            except subprocess.CalledProcessError:
                _install_fallback_pinned()
        print("[Bootstrap] Dependencies installed.")
        return
    except subprocess.CalledProcessError:
        print("\n[ERROR] Failed to install packages using wheels only.")
        print("Likely causes: very new Python without wheels yet, or network restrictions.")
        print("Fixes: use Python 3.11/3.12 x64, or allow PyPI wheel downloads, then rerun.")
        sys.exit(3)

def _autodetect_data_root(cli_value: Optional[str]) -> Path:
    if cli_value:
        candidate = Path(cli_value).resolve()
        if (candidate / "safedocs_dataset").exists():
            return candidate
        if candidate.name.lower() == "safedocs_dataset":
            return candidate.parent
        raise SystemExit(f"[ERROR] --data-root '{candidate}' does not contain 'safedocs_dataset/'")
    script_dir = Path(__file__).resolve().parent
    cwd = Path.cwd()
    candidates: List[Path] = []
    def add(base: Path):
        candidates.append(base / "safedocs_dataset")
        candidates.append(base / "SafeDocs_Datasets_ML" / "safedocs_dataset")
    for base in {cwd, script_dir, script_dir.parent, script_dir.parent.parent}:
        add(base)
    if os.name == "nt":
        for letter in "CDEFGHIJKLMNOPQRSTUVWXYZ":
            root = Path(f"{letter}:/")
            if root.exists():
                add(root)
    for sd in candidates:
        if sd.exists() and sd.is_dir():
            print(f"[AutoDetect] Using data root: {sd.parent}")
            return sd.parent
    raise SystemExit(
        "[ERROR] Could not find your dataset automatically.\n"
        "Create <DATA_ROOT>/safedocs_dataset/ and run with:\n"
        "  python safedocs_lightgbm.py --data-root \"E:/SafeDocs_Datasets_ML\""
    )

# 1) Relaunch inside .venv, 2) Install wheels
_ensure_venv_and_reexec()
_ensure_dependencies()

# ---------------------------
# Phase 1: third-party imports (safe now)
# ---------------------------
import numpy as np
import pandas as pd
import joblib
from tqdm import tqdm
from lightgbm import LGBMClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, roc_auc_score, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

# ---------------------------
# Utility helpers
# ---------------------------
def entropy(b: bytes) -> float:
    if not b:
        return 0.0
    cnt = Counter(b); n = len(b); e = 0.0
    for c in cnt.values():
        p = c / n
        if p:
            e -= p * math.log2(p)
    return float(e)

def chunk_entropy_percentiles(b: bytes, chunk_size=4096, percentiles=(95,)) -> Dict[str, float]:
    if not b:
        return {f"entropy_p{p}": 0.0 for p in percentiles}
    vals = [entropy(b[i:i+chunk_size]) for i in range(0, len(b), chunk_size)]
    arr = np.array(vals)
    return {f"entropy_p{p}": float(np.percentile(arr, p)) for p in percentiles}

def safe_read_bytes(p: Path, max_bytes=6_000_000) -> bytes:
    try:
        with open(p, "rb") as f:
            return f.read(max_bytes)
    except Exception:
        return b""

def count_urls_text(text: str) -> int:
    return len(re.findall(r"https?://[^\s\\]+", text, flags=re.IGNORECASE))

def is_ole_cfb(b: bytes) -> bool:
    return b.startswith(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1")

def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

def ext_onehots(ext: str) -> Dict[str, int]:
    feats = {f"ext_is_{e.strip('.')}": 0 for e in SUPPORTED_EXTS}
    feats[f"ext_is_{ext.strip('.')}"] = 1
    return feats

def sha256_of_file(path: Path, max_bytes: int = 4_000_000) -> str:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            h.update(f.read(max_bytes))
    except Exception:
        return ""
    return h.hexdigest()

# ---------------------------
# Feature extraction
# ---------------------------
def extract_features_ooxml(path: Path, data: bytes) -> Dict[str, float | int | bool]:
    import zipfile
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
                    except Exception: pass
                if any(ln.startswith(p) for p in ["word/embeddings/", "ppt/embeddings/", "xl/embeddings/"]):
                    feats["ole_object_count"] += 1
                if ("activex" in ln) or ("control" in ln):
                    feats["has_activex"] = 1
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
                    except Exception: pass
            if macro_bytes:
                feats["macro_size"] = len(macro_bytes)
                ents = chunk_entropy_percentiles(macro_bytes, chunk_size=2048, percentiles=(95,))
                feats["macro_entropy_p95"] = ents.get("entropy_p95", 0.0)
                feats["vba_module_count"] = int(macro_bytes.count(b"Attribute VB_Name"))
    except Exception:
        pass
    return feats

def extract_features_pdf(path: Path, data: bytes) -> Dict[str, float | int | bool]:
    feats = {
        "pdf_has_js": 0, "pdf_has_openaction": 0, "pdf_has_launch": 0,
        "pdf_uri_count": 0, "pdf_embedded_file_count": 0,
        "pdf_object_count": 0, "pdf_stream_count": 0, "pdf_xref_count": 0,
        "pdf_entropy_p95": 0.0,
    }
    if not data.startswith(b"%PDF"):
        return feats
    feats["pdf_has_js"] = int(any(tok in data for tok in PDF_TOKENS["has_js"]))
    feats["pdf_has_openaction"] = int(any(tok in data for tok in PDF_TOKENS["has_openaction"]))
    feats["pdf_has_launch"] = int(b"/Launch" in data)
    feats["pdf_uri_count"] = int(sum(data.count(tok) for tok in [b"/URI", b"/GoToR"]))
    feats["pdf_embedded_file_count"] = int(sum(data.count(tok) for tok in [b"/EmbeddedFile", b"/EmbeddedFiles"]))
    feats["pdf_object_count"] = int(data.count(b" obj"))
    feats["pdf_stream_count"] = int(data.count(b"stream"))
    feats["pdf_xref_count"] = int(data.count(b"xref"))
    feats["pdf_entropy_p95"] = chunk_entropy_percentiles(data, chunk_size=4096, percentiles=(95,)).get("entropy_p95", 0.0)
    return feats

def extract_features_rtf(path: Path, data: bytes) -> Dict[str, float | int | bool]:
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
    try:
        text = data.decode("latin-1", errors="ignore")
    except Exception:
        text = ""
    feats["rtf_url_count"] = count_urls_text(text)
    if b"\\objdata" in data and (b"Package" in data or b"D0CF" in data.upper()):
        feats["rtf_has_ole_packager_hint"] = 1
    feats["rtf_entropy_p95"] = chunk_entropy_percentiles(data, chunk_size=4096, percentiles=(95,)).get("entropy_p95", 0.0)
    return feats

def extract_features_xls_ole(path: Path, data: bytes) -> Dict[str, float | int | bool]:
    feats = {"xls_is_ole": int(is_ole_cfb(data)), "xls_has_vba_hint": 0, "xls_vba_token_count": 0}
    if not feats["xls_is_ole"]:
        return feats
    feats["xls_has_vba_hint"] = int(b"VBA" in data)
    feats["xls_vba_token_count"] = int(data.count(b"VBA") + data.count(b"Attribute VB_Name"))
    return feats

def extract_features_general(path: Path, data: bytes) -> Dict[str, float | int | bool]:
    ext = path.suffix.lower()
    feats = {
        "file_size": path.stat().st_size if path.exists() else len(data),
        "entropy_p95": chunk_entropy_percentiles(data, chunk_size=4096, percentiles=(95,)).get("entropy_p95", 0.0),
        "suspicious_token_count": int(sum(data.count(tok) for tok in OFFICE_SUSP_TOKENS)),
    }
    try:
        text = data.decode("utf-8", errors="ignore")
    except Exception:
        text = ""
    feats["url_count_general"] = count_urls_text(text)
    feats.update(ext_onehots(ext))
    return feats

def extract_features_for_file(path: Path) -> Dict[str, float | int | bool]:
    data = safe_read_bytes(path)
    ext = path.suffix.lower()
    feats = {}
    feats.update(extract_features_general(path, data))
    if ext in {".docx", ".xlsx", ".pptx"}:
        feats.update(extract_features_ooxml(path, data))
    elif ext == ".pdf":
        feats.update(extract_features_pdf(path, data))
    elif ext == ".rtf":
        feats.update(extract_features_rtf(path, data))
    elif ext == ".xls":
        feats.update(extract_features_xls_ole(path, data))
    return feats

# ---------------------------
# Dataset scanning & splitting
# ---------------------------
@dataclass
class FileRecord:
    file_id: str
    path: str
    ext: str
    label: int
    source: str  # 'office_pdf' or 'json_features'

def scan_raw_dataset(data_root: Path) -> List[FileRecord]:
    raw_dir = data_root / "safedocs_dataset" / "raw"
    jf_root = raw_dir / "json_features"
    op_root = raw_dir / "office_pdf"
    out: List[FileRecord] = []
    for source_root, source_name, patterns in [
        (jf_root, "json_features", (".json",)),
        (op_root, "office_pdf", tuple(SUPPORTED_EXTS)),
    ]:
        for label_name, label in [("benign", 0), ("malicious", 1)]:
            d = source_root / label_name
            if not d.exists():
                continue
            for p in d.rglob("*"):
                if p.is_file() and p.suffix.lower() in patterns:
                    fid = sha256_of_file(p)
                    out.append(FileRecord(
                        file_id=fid or p.stem,
                        path=str(p.resolve()),
                        ext=p.suffix.lower(),
                        label=int(label),
                        source=source_name
                    ))
    return out

def stratified_split_indices(labels: List[int], train_frac=0.7, val_frac=0.15, test_frac=0.15, seed=RANDOM_STATE):
    import numpy as _np
    idx = _np.arange(len(labels))
    y = _np.array(labels)
    try:
        idx_train, idx_temp, y_train, y_temp = train_test_split(
            idx, y, test_size=(1 - train_frac), stratify=y, random_state=seed
        )
        test_size = test_frac / (val_frac + test_frac)
        idx_val, idx_test, _, _ = train_test_split(
            idx_temp, y_temp, test_size=test_size, stratify=y_temp, random_state=seed
        )
    except ValueError:
        # If a class is missing, fall back to non-stratified splits
        idx_train, idx_temp = train_test_split(idx, test_size=(1 - train_frac), random_state=seed, shuffle=True)
        test_size = test_frac / (val_frac + test_frac)
        idx_val, idx_test = train_test_split(idx_temp, test_size=test_size, random_state=seed, shuffle=True)
    return set(int(x) for x in idx_train), set(int(x) for x in idx_val), set(int(x) for x in idx_test)

def copy_to_working(records: List[FileRecord], data_root: Path, split_map: Dict[str, set]):
    wk_root = data_root / "safedocs_dataset" / "working"
    for split_name, idxs in split_map.items():
        for i in idxs:
            rec = records[int(i)]
            subdir = "office_pdf" if rec.source == "office_pdf" else "json_features"
            label_dir = "benign" if rec.label == 0 else "malicious"
            dst_dir = wk_root / split_name / subdir / label_dir
            ensure_dir(dst_dir)
            src = Path(rec.path)
            dst = dst_dir / f"{rec.file_id}{src.suffix.lower()}"
            if not dst.exists():
                try:
                    shutil.copy2(src, dst)
                except Exception:
                    pass

# ---------------------------
# Feature table assembly
# ---------------------------
def load_json_features(path: Path) -> Dict[str, float | int | bool]:
    """Robust loader: skip unmanageable JSON/identifier files (per your instruction)."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            obj = json.load(f)
    except Exception:
        return {}
    if isinstance(obj, dict) and "features" in obj and isinstance(obj["features"], dict):
        obj = obj["features"]
    if not isinstance(obj, dict):
        return {}
    out: Dict[str, float | int | bool] = {}
    for k, v in obj.items():
        if isinstance(v, (int, float, bool)):
            out[k] = int(v) if isinstance(v, bool) else float(v) if isinstance(v, float) else int(v)
        elif isinstance(v, str):
            try:
                out[k] = float(v) if "." in v else int(v)
            except Exception:
                pass
    return out

def build_feature_table(records: List[FileRecord], split_map: Dict[str, set]) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    rows, y, split_col = [], [], []
    for i, rec in enumerate(tqdm(records, desc="Extracting features")):
        path = Path(rec.path)
        feats: Dict[str, float | int | bool] = {}
        if rec.source == "json_features" and path.suffix.lower() == ".json":
            feats.update(load_json_features(path))
            if not feats:
                continue  # skip unusable JSON entries
        elif rec.source == "office_pdf":
            feats.update(extract_features_for_file(path))
        else:
            continue
        feats["label"] = int(rec.label)
        feats["source_is_json"] = int(rec.source == "json_features")
        feats["source_is_office"] = int(rec.source == "office_pdf")
        feats["file_ext"] = rec.ext
        feats["file_id"] = rec.file_id
        rows.append(feats)
        y.append(int(rec.label))
        split_name = "train" if int(i) in split_map["train"] else ("val" if int(i) in split_map["val"] else "test")
        split_col.append(split_name)
    if not rows:
        raise SystemExit("[ERROR] After scanning, no usable files were found (JSONs unmanageable and no office/pdf files).")
    df = pd.DataFrame(rows).fillna(-1)
    y = pd.Series(y, name="label").astype(int)
    split_series = pd.Series(split_col, name="split")
    return df, y, split_series

# ---------------------------
# Modeling (LightGBM + calibration)
# ---------------------------
def make_model():
    return LGBMClassifier(
        num_leaves=128,
        max_depth=12,
        learning_rate=0.05,
        min_child_samples=50,
        feature_fraction=0.8,
        bagging_fraction=0.8,
        bagging_freq=1,
        n_estimators=2000,
        objective="binary",
        n_jobs=max(1, os.cpu_count() - 1),
        random_state=RANDOM_STATE
    )

def _two_col_proba(estimator, X: np.ndarray) -> np.ndarray:
    """Return Nx2 probabilities even if the estimator exposes 1 column (single-class)."""
    P = estimator.predict_proba(X)
    if P.ndim == 1:
        P = P.reshape(-1, 1)
    if P.shape[1] == 2:
        return P
    # Expand to two columns
    pcol = np.clip(P[:, 0], 0.0, 1.0)
    classes = getattr(estimator, "classes_", None)
    if classes is not None and len(classes) == 1:
        only = int(classes[0])
        if only == 1:
            pos = pcol
            return np.stack([1 - pos, pos], axis=1)
        elif only == 0:
            neg = pcol
            return np.stack([neg, 1 - neg], axis=1)
    # Fallback: assume column is P(class1)
    pos = pcol
    return np.stack([1 - pos, pos], axis=1)

def train_and_calibrate(X_train, y_train, X_val, y_val):
    classes = np.unique(y_train)
    class_weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    weight_map = {int(c): float(w) for c, w in zip(classes, class_weights)}
    sample_weight = np.array([weight_map[int(y)] for y in y_train], dtype=float)

    model = make_model()
    model.fit(
        X_train, y_train,
        sample_weight=sample_weight,
        eval_set=[(X_val, y_val)],
        eval_metric="auc",
    )
    if hasattr(model, "best_iteration_") and model.best_iteration_ is not None:
        model.set_params(n_estimators=int(model.best_iteration_))

    # If validation set has a single class, skip calibration
    if len(np.unique(y_val)) < 2:
        print("[Calibrate] Skipping calibration: validation set contains a single class.")
        return model, None

    calib_method = "isotonic" if len(y_val) >= 2000 else "sigmoid"
    try:
        calibrator = CalibratedClassifierCV(model, method=calib_method, cv="prefit")
        calibrator.fit(X_val, y_val)
        return model, calibrator
    except Exception as e:
        print(f"[Calibrate] Calibration failed ({e}). Using uncalibrated model.")
        return model, None

def evaluate_split(name: str, predictor, X, y):
    P = _two_col_proba(predictor, X)
    prob = P[:, 1]
    pred = (prob >= 0.5).astype(int)
    acc = float(accuracy_score(y, pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y, pred, average="binary", zero_division=0)
    prec = float(prec); rec = float(rec); f1 = float(f1)
    try:
        auc = float(roc_auc_score(y, prob))
    except Exception:
        auc = float("nan")
    cm = confusion_matrix(y, pred)
    print(f"\n=== {name.upper()} ===")
    print(f"Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")
    print("Confusion matrix [ [TN FP]\n                   [FN TP] ]:")
    print(cm)
    return {"split": name, "accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "roc_auc": auc, "cm": cm.tolist()}

# ---------------------------
# Prediction & tagging
# ---------------------------
def derive_tags_and_severity(feats: Dict[str, float | int | bool], prob_malicious: float):
    tags = []
    if feats.get("vba_module_count", 0) > 0 or feats.get("macro_size", 0) > 0:
        tags.append("VBA macros detected")
    if feats.get("has_activex", 0) > 0:
        tags.append("ActiveX controls")
    if feats.get("ole_object_count", 0) > 0 or feats.get("rtf_has_ole_packager_hint", 0) > 0:
        tags.append("Embedded OLE objects")
    if feats.get("token_CreateObject", 0) > 0 or feats.get("token_Shell", 0) > 0 or feats.get("token_WScript", 0) > 0:
        tags.append("Suspicious automation APIs")
    if feats.get("pdf_has_js", 0) > 0:
        tags.append("PDF JavaScript")
    if feats.get("pdf_has_openaction", 0) > 0:
        tags.append("Auto-execute action")
    if feats.get("pdf_has_launch", 0) > 0:
        tags.append("Launch action")
    total_urls = feats.get("url_count", 0) + feats.get("url_count_general", 0) + feats.get("pdf_uri_count", 0) + feats.get("rtf_url_count", 0)
    if total_urls > 10:
        tags.append("Unusually many links")
    elif total_urls > 0:
        tags.append("Contains links")
    sev = float(prob_malicious)
    if "Auto-execute action" in tags or "PDF JavaScript" in tags or "ActiveX controls" in tags:
        sev = min(1.0, sev + 0.2)
    if "VBA macros detected" in tags:
        sev = min(1.0, sev + 0.1)
    if "Embedded OLE objects" in tags:
        sev = min(1.0, sev + 0.1)
    severity_score = int(round(sev * 100))
    sanitize = severity_score >= 40 or "VBA macros detected" in tags or "PDF JavaScript" in tags or "Embedded OLE objects" in tags
    return tags, severity_score, sanitize

def predict_single_file(predictor, feature_cols: List[str], path: Path):
    feats = extract_features_for_file(path)
    for col in feature_cols:
        feats.setdefault(col, -1)
    X = pd.DataFrame([feats])[feature_cols].values
    prob = float(_two_col_proba(predictor, X)[:, 1][0])
    pred = int(prob >= 0.5)
    tags, severity, sanitize = derive_tags_and_severity(feats, prob)
    return {
        "file": str(path),
        "prob_malicious": prob,
        "prediction": int(pred),
        "tags": tags,
        "severity_0_100": severity,
        "sanitize_recommended": bool(sanitize),
        "top_feature_hints": sorted(
            [(k, feats[k]) for k in ["vba_module_count", "has_activex", "ole_object_count",
                                     "macro_size", "pdf_has_js", "pdf_has_openaction",
                                     "suspicious_token_count"] if k in feats],
            key=lambda x: str(x[0])
        )
    }

# ---------------------------
# Main
# ---------------------------
def autodetect_data_root(cli_value: Optional[str]) -> Path:
    if cli_value:
        candidate = Path(cli_value).resolve()
        if (candidate / "safedocs_dataset").exists():
            return candidate
        if candidate.name.lower() == "safedocs_dataset":
            return candidate.parent
        raise SystemExit(f"[ERROR] --data-root '{candidate}' does not contain 'safedocs_dataset/'")
    script_dir = Path(__file__).resolve().parent
    cwd = Path.cwd()
    candidates: List[Path] = []
    def add(base: Path):
        candidates.append(base / "safedocs_dataset")
        candidates.append(base / "SafeDocs_Datasets_ML" / "safedocs_dataset")
    for base in {cwd, script_dir, script_dir.parent, script_dir.parent.parent}:
        add(base)
    if os.name == "nt":
        for letter in "CDEFGHIJKLMNOPQRSTUVWXYZ":
            root = Path(f"{letter}:/")
            if root.exists():
                add(root)
    for sd in candidates:
        if sd.exists() and sd.is_dir():
            print(f"[AutoDetect] Using data root: {sd.parent}")
            return sd.parent
    raise SystemExit(
        "[ERROR] Could not find your dataset automatically.\n"
        "Create <DATA_ROOT>/safedocs_dataset/ and run with:\n"
        "  python safedocs_lightgbm.py --data-root \"E:/SafeDocs_Datasets_ML\""
    )

def main():
    parser = argparse.ArgumentParser(description="SafeDocs LightGBM pipeline (auto-venv + wheels-only + robust eval)")
    parser.add_argument("--data-root", type=str, default=None, help="Folder that CONTAINS 'safedocs_dataset/'. If omitted, auto-detect.")
    parser.add_argument("--predict", type=str, default=None, help="Optional: analyze a single file after training")
    parser.add_argument("--skip-copy", action="store_true", help="Skip copying files into working/ splits if already done")
    args = parser.parse_args()

    data_root = autodetect_data_root(args.data_root)
    sd_root = data_root / "safedocs_dataset"
    meta_dir = sd_root / "metadata"
    models_dir = sd_root / "models"
    ensure_dir(meta_dir); ensure_dir(models_dir)

    print("[1/6] Scanning raw dataset ...")
    records = scan_raw_dataset(data_root)
    if not records:
        raise SystemExit("[ERROR] No files found in raw/json_features or raw/office_pdf.")

    # Manifest
    manifest_rows = [{"file_id": r.file_id, "path": r.path, "ext": r.ext, "label": int(r.label), "source": r.source} for r in records]
    manifest_path = meta_dir / "manifest.csv"
    pd.DataFrame(manifest_rows).to_csv(manifest_path, index=False)
    print(f"  Wrote manifest: {manifest_path}  ({len(manifest_rows)} rows)")

    print("[2/6] Creating stratified 70/15/15 split ...")
    labels = [int(r.label) for r in records]
    idx_train, idx_val, idx_test = stratified_split_indices(labels, 0.70, 0.15, 0.15, seed=RANDOM_STATE)
    split_map = {"train": idx_train, "val": idx_val, "test": idx_test}
    with open(meta_dir / "splits.json", "w", encoding="utf-8") as f:
        json.dump({k: [int(x) for x in sorted(v)] for k, v in split_map.items()}, f, indent=2)

    if not args.skip_copy:
        print("[3/6] Copying files into working/{train,val,test}/... (first time may take a bit)")
        copy_to_working(records, data_root, split_map)
        print("  Copy complete.")

    print("[4/6] Extracting features and assembling table ...")
    df, y, split_series = build_feature_table(records, split_map)
    feat_csv = meta_dir / "features.csv"
    df.to_csv(feat_csv, index=False)
    print(f"  Features saved: {feat_csv} (shape={df.shape})")

    feature_cols = [c for c in df.columns if c not in ["label", "file_ext", "file_id", "split"]]
    X = df[feature_cols].values
    train_mask = (split_series == "train").values
    val_mask = (split_series == "val").values
    test_mask = (split_series == "test").values
    X_train, y_train = X[train_mask], y[train_mask].values
    X_val, y_val = X[val_mask], y[val_mask].values
    X_test, y_test = X[test_mask], y[test_mask].values

    print("[5/6] Training LightGBM + (conditional) calibration ...")
    model, calibrator = train_and_calibrate(X_train, y_train, X_val, y_val)
    predictor = calibrator if calibrator is not None else model  # use calibrated if available

    print("[6/6] Evaluating ...")
    metrics = {}
    metrics["train"] = evaluate_split("train", predictor, X_train, y_train)
    metrics["val"] = evaluate_split("val", predictor, X_val, y_val)
    metrics["test"] = evaluate_split("test", predictor, X_test, y_test)

    joblib.dump({"model": model, "calibrator": calibrator, "feature_cols": feature_cols}, models_dir / "lightgbm_calibrated.pkl")
    (models_dir / "feature_cols.json").write_text(json.dumps(feature_cols, indent=2), encoding="utf-8")
    (meta_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"\nSaved model -> {models_dir / 'lightgbm_calibrated.pkl'}")
    print(f"Saved feature columns -> {models_dir / 'feature_cols.json'}")
    print(f"Saved metrics -> {meta_dir / 'metrics.json'}")

    if args.predict:
        p = Path(args.predict)
        if not p.exists():
            print(f"[WARN] --predict file not found: {p}")
        else:
            print(f"\n[Predict] Analyzing: {p}")
            bundle = joblib.load(models_dir / "lightgbm_calibrated.pkl")
            calib = bundle["calibrator"]
            feat_cols = bundle["feature_cols"]
            pred_model = calib if calib is not None else bundle["model"]
            res = predict_single_file(pred_model, feat_cols, p)
            print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
