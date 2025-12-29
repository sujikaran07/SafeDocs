#!/usr/bin/env python3
import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader

from embedder import FrozenMiniLM
from mlp_head import MLPHead
from text_extract import extract_text_for_embed


# -------------------- helpers --------------------

def _default_manifest_path() -> Path:
    """Resolve a default manifest path relative to THIS script, not CWD.
    Accept either 'manifest.csv' or 'manifest' in ../metadata/."""
    script_dir = Path(__file__).resolve().parent
    cand_csv = (script_dir.parent / "metadata" / "manifest.csv").resolve()
    cand_plain = (script_dir.parent / "metadata" / "manifest").resolve()
    if cand_csv.exists():
        return cand_csv
    if cand_plain.exists():
        return cand_plain
    # fallback to CSV path (good error message later if missing)
    return cand_csv


def load_manifest(path: Path) -> pd.DataFrame:
    """Read manifest, normalize headers, ensure required columns & split."""
    df = pd.read_csv(path)
    # normalize headers: strip, lowercase, spaces->underscores
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    required = {"sha256", "label", "file_path"}
    if not required.issubset(df.columns):
        missing = required - set(df.columns)
        raise SystemExit(
            f"Manifest missing columns: {missing}. Found: {list(df.columns)}\n"
            f"Required columns are: sha256, label, file_path (+ optional 'split')."
        )

    # label -> 0/1
    if df["label"].dtype == object:
        df["label"] = (
            df["label"]
            .astype(str)
            .str.strip()
            .str.lower()
            .isin(["1", "true", "malicious", "yes"])
            .astype(int)
        )
    else:
        df["label"] = pd.to_numeric(df["label"], errors="coerce").fillna(0).astype(int)

    # ensure 'split'
    if "split" not in df.columns:
        from sklearn.model_selection import train_test_split
        strat = df["label"] if df["label"].nunique() > 1 else None
        tr, va = train_test_split(df, test_size=0.2, stratify=strat, random_state=123)
        tr["split"] = "train"
        va["split"] = "val"
        df = pd.concat([tr, va], ignore_index=True)

    return df[["sha256", "label", "file_path", "split"]]


class EmbDS(Dataset):
    """On-the-fly MiniLM embeddings dataset (robust to empty/unreadable files)."""

    def __init__(self, rows):
        self.rows = rows
        self.encoder = FrozenMiniLM()

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        sha, y, fpath = self.rows[i]
        f = Path(fpath)
        # extract text (empty -> zero vector so training never crashes)
        try:
            text = extract_text_for_embed(f)
        except Exception:
            text = ""
        emb = self.encoder.encode_text(text) if text else np.zeros((384,), dtype="float32")
        return emb.astype("float32"), np.float32(y)


# -------------------- main --------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default=str(_default_manifest_path()),
                        help="Path to manifest file (manifest.csv or manifest). "
                             "Must have columns: sha256,label,file_path[,split]")
    parser.add_argument("--batch", type=int, default=256)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--lr", type=float, default=1e-3)
    # save relative to repo structure by default
    script_dir = Path(__file__).resolve().parent
    parser.add_argument("--out", default=str((script_dir.parent / "models" / "mlp_head.pt").resolve()))
    args = parser.parse_args()

    mani = Path(args.manifest)
    if not mani.exists():
        raise SystemExit(
            f"Manifest not found: {mani}\n"
            f"Tip: if your file is named 'manifest' (no extension), pass the full path:\n"
            f'  python scripts\\train_mlp_head.py --manifest "E:\\SafeDocs_Datasets_ML\\safedocs_dataset\\metadata\\manifest"'
        )

    df = load_manifest(mani)

    def rows(split):
        d = df[df["split"] == split]
        return list(d[["sha256", "label", "file_path"]].itertuples(index=False, name=None))

    tr_rows, va_rows = rows("train"), rows("val")
    if len(tr_rows) == 0 or len(va_rows) == 0:
        raise SystemExit(f"Not enough data after split. Train={len(tr_rows)} Val={len(va_rows)}")

    dl_tr = DataLoader(EmbDS(tr_rows), batch_size=args.batch, shuffle=True, num_workers=0)
    dl_va = DataLoader(EmbDS(va_rows), batch_size=args.batch, shuffle=False, num_workers=0)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = MLPHead().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-2)
    lossf = torch.nn.BCEWithLogitsLoss()

    best = None
    patience = 5
    bad = 0

    for ep in range(args.epochs):
        # train
        model.train()
        for x, y in dl_tr:
            x, y = x.to(device), y.to(device)
            opt.zero_grad()
            loss = lossf(model(x), y)
            loss.backward()
            opt.step()

        # validate
        model.eval()
        tot = 0.0
        n = 0
        with torch.no_grad():
            for x, y in dl_va:
                x, y = x.to(device), y.to(device)
                v = lossf(model(x), y).item()
                tot += v * x.size(0)
                n += x.size(0)
        vloss = tot / max(1, n)
        print(f"epoch {ep} val_loss={vloss:.4f}")

        # early stop + save best
        if best is None or vloss < best:
            best, bad = vloss, 0
            out_p = Path(args.out)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), out_p)
        else:
            bad += 1
            if bad >= patience:
                break

    print("Saved", args.out)


if __name__ == "__main__":
    main()
