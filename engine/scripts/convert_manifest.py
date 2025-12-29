#!/usr/bin/env python3
import argparse, csv, hashlib, sys
from pathlib import Path
import pandas as pd

def sha256_of(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1<<20), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True, help="Path to your current manifest (with columns like file_id,path,ext,label,source)")
    ap.add_argument("--out", dest="dst", required=True, help="Path to write normalized manifest.csv")
    ap.add_argument("--path-root", default="", help="Optional base folder to prefix if 'path' is relative")
    ap.add_argument("--file-id-is-sha256", action="store_true", help="Set if file_id already stores a 64-hex sha256")
    args = ap.parse_args()

    df = pd.read_csv(args.src)
    # normalize headers
    df.columns = [str(c).strip().lower().replace(" ","_") for c in df.columns]

    # map columns
    if "path" not in df.columns or "label" not in df.columns:
        sys.exit(f"Input must have at least 'path' and 'label'. Found: {list(df.columns)}")

    # Build absolute file_path
    root = Path(args.path_root).resolve() if args.path_root else None
    file_paths = []
    for p in df["path"].astype(str):
        P = Path(p)
        if not P.is_absolute():
            P = (root / P) if root else P.resolve()
        file_paths.append(str(P))
    df["_file_path"] = file_paths

    # sha256: use file_id if flagged and looks like sha256; else compute from file
    sha_vals = []
    for fp, fid in zip(df["_file_path"], df.get("file_id", [""]*len(df))):
        fid = str(fid).strip()
        if args.file_id_is_sha256 and len(fid)==64 and all(ch in "0123456789abcdefABCDEF" for ch in fid):
            sha_vals.append(fid.lower())
        else:
            P = Path(fp)
            if not P.exists():
                sha_vals.append("")  # fill later; we’ll drop missing rows
            else:
                try:
                    sha_vals.append(sha256_of(P))
                except Exception:
                    sha_vals.append("")
    df["_sha256"] = sha_vals

    # normalize label to 0/1
    lab = df["label"]
    if lab.dtype == object:
        y = lab.astype(str).str.strip().str.lower().map(
            {"1":1,"true":1,"malicious":1,"yes":1,"0":0,"false":0,"benign":0,"no":0}
        ).fillna(0).astype(int)
    else:
        y = pd.to_numeric(lab, errors="coerce").fillna(0).astype(int)
    df["_label"] = y

    # drop rows with missing files or sha256
    keep = []
    for fp, sha in zip(df["_file_path"], df["_sha256"]):
        if fp and sha and Path(fp).exists():
            keep.append(True)
        else:
            keep.append(False)
    df2 = df[keep].copy()

    # simple split if not present
    if "split" in df2.columns:
        df2["_split"] = df2["split"].astype(str)
    else:
        from sklearn.model_selection import train_test_split
        strat = df2["_label"] if df2["_label"].nunique()>1 else None
        tr, va = train_test_split(df2, test_size=0.2, stratify=strat, random_state=123)
        tr["_split"] = "train"; va["_split"] = "val"
        df2 = pd.concat([tr, va], ignore_index=True)

    # Write trainer-ready CSV
    outp = Path(args.dst); outp.parent.mkdir(parents=True, exist_ok=True)
    df_out = df2.rename(columns={"_sha256":"sha256","_label":"label","_file_path":"file_path","_split":"split"})
    df_out = df_out[["sha256","label","file_path","split"]]  # exact order
    df_out.to_csv(outp, index=False)
    print(f"Wrote normalized manifest to {outp} with {len(df_out)} rows.")

if __name__ == "__main__":
    main()
