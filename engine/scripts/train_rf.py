#!/usr/bin/env python3
"""
Train RandomForest + ExtraTrees on SafeDocs features.csv
- Robust to cwd (finds features.csv automatically or via --features)
- Normalizes headers (strip, lowercase, spaces->underscores)
- Detects label column automatically (includes 'kill')
- Drops non-numeric columns
- Handles single-class case gracefully
"""

import argparse, json, re
from pathlib import Path
import pandas as pd, numpy as np, joblib
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.calibration import CalibratedClassifierCV

# ----------------------- utils -----------------------

def find_features_csv(cli_path: str | None) -> Path:
    if cli_path:
        p = Path(cli_path).expanduser().resolve()
        if not p.exists():
            raise FileNotFoundError(f"--features path does not exist: {p}")
        return p
    script_dir = Path(__file__).resolve().parent
    for candidate in [
        script_dir.parent / "features" / "features.csv",
        script_dir / "features.csv",
        script_dir.parent / "features.csv",
    ]:
        if candidate.exists():
            return candidate.resolve()
    for p in script_dir.parent.rglob("features.csv"):
        return p.resolve()
    raise FileNotFoundError("Could not locate features.csv.")

def clean_header(name: str) -> str:
    # strip, collapse internal whitespace, lowercase, spaces->underscores
    s = re.sub(r"\s+", " ", str(name)).strip().lower()
    s = s.replace(" ", "_")
    return s

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    mapping = {c: clean_header(c) for c in df.columns}
    return df.rename(columns=mapping), mapping

# ----------------------- main -----------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", help="Path to features.csv")
    ap.add_argument("--out", help="Output dir for RF artifacts (default: ../models/models_rf)")
    ap.add_argument("--label-col", help="Name of label column (if auto-detect fails; case/space-insensitive)")
    args = ap.parse_args()

    data_path = find_features_csv(args.features)
    print(f"[train_rf] Using features file: {data_path}")

    script_dir = Path(__file__).resolve().parent
    out_dir = Path(args.out).resolve() if args.out else (script_dir.parent / "models" / "models_rf")
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[train_rf] Artifacts will be saved to: {out_dir}")

    # Load + normalize headers
    df_raw = pd.read_csv(data_path)
    df, colmap = normalize_columns(df_raw)
    print(f"[train_rf] Normalized columns example -> {list(df.columns)[:8]} ...")

    # Detect label column (after normalization)
    candidates = {"label","target","y","is_malicious","malicious","class","category","kill"}
    label_col = None
    for c in df.columns:
        if c in candidates or ("label" in c) or ("target" in c):
            label_col = c
            break

    # Allow explicit override (normalize the provided name too)
    if not label_col and args.label_col:
        cand = clean_header(args.label_col)
        if cand in df.columns:
            label_col = cand
        else:
            raise ValueError(f"--label-col '{args.label_col}' (normalized '{cand}') not found in CSV headers: {list(df.columns)}")

    if not label_col:
        raise ValueError(f"No label column found. Available columns: {list(df.columns)}.\n"
                         f"Pass one explicitly with --label-col <column_name>")

    # Convert labels to 0/1
    y_series = df[label_col]
    if y_series.dtype == object:
        y = y_series.astype(str).str.strip().str.lower().isin(["1","true","malicious","yes"]).astype(int).values
    else:
        y = pd.to_numeric(y_series, errors="coerce").fillna(0).astype(int).values

    # Drop non-feature cols
    drop_cols = {label_col}
    drop_cols |= {c for c in df.columns if c in {
        "sha256","file_id","id","hash","filename","file_name","name","path","extension","mime","base64_strings"
    }}  # add any known non-numeric ID-ish columns here
    X_df = df.drop(columns=list(drop_cols))

    # Keep only numeric/bool
    X_df = X_df.select_dtypes(include=["number","bool"])
    feature_names = X_df.columns.tolist()
    if len(feature_names) == 0:
        raise ValueError("No numeric feature columns left after dropping id/label columns.")
    X = X_df.values

    n_pos = int((y == 1).sum()); n_neg = int((y == 0).sum())
    print(f"[train_rf] Samples: {len(y)} | Positives: {n_pos} | Negatives: {n_neg}")

    # Train RF / ET
    rf = RandomForestClassifier(
        n_estimators=900, max_depth=None, min_samples_leaf=2, max_features="sqrt",
        class_weight="balanced_subsample", n_jobs=-1, oob_score=True, random_state=42
    ).fit(X, y)

    et = ExtraTreesClassifier(
        n_estimators=900, max_depth=None, min_samples_leaf=2, max_features="sqrt",
        class_weight="balanced_subsample", n_jobs=-1, random_state=42
    ).fit(X, y)

    # Calibrate only if 2 classes exist
    if len(np.unique(y)) > 1:
        calib_method = "sigmoid" if (len(y) < 5000 or n_pos < 300) else "isotonic"
        print(f"[train_rf] Calibration: {calib_method}")
        cal = CalibratedClassifierCV(rf, method=calib_method, cv=5).fit(X, y)
        joblib.dump(cal, out_dir / "random_forest_calibrated.joblib")
    else:
        print("[train_rf] WARNING: Only one class present. Skipping calibration.")

    # Save artifacts
    (out_dir / "rf_features.json").write_text(json.dumps({"feature_names": feature_names}, indent=2))
    joblib.dump(rf, out_dir / "random_forest.joblib")
    joblib.dump(et,  out_dir / "extratrees.joblib")
    print("[train_rf] Saved:", out_dir)

if __name__ == "__main__":
    main()
