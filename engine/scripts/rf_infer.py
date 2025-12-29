#!/usr/bin/env python3
# rf_infer.py — load calibrated RandomForest and score a single feature dict or a CSV.
import joblib, json, numpy as np, pandas as pd
from pathlib import Path

MODEL_DIR = Path("models_rf")
CAL_RF = MODEL_DIR/"random_forest_calibrated.joblib"
RF = MODEL_DIR/"random_forest.joblib"
ET = MODEL_DIR/"extratrees.joblib"
FEATS_FILE = MODEL_DIR/"rf_features.json"

with open(FEATS_FILE) as f:
    feature_names = json.load(f)["feature_names"]

rf_cal = joblib.load(CAL_RF)
rf = joblib.load(RF)
et = joblib.load(ET)

def score_features(feats: dict):
    x = np.array([[feats.get(f, 0.0) for f in feature_names]])
    p_rf = float(rf_cal.predict_proba(x)[0,1])
    p_et = float(et.predict_proba(x)[0,1])
    # simple average of RF-Cal and ET
    p_tree = 0.6*p_rf + 0.4*p_et
    return {"rf_cal": p_rf, "et": p_et, "tree_blend": p_tree}

if __name__ == "__main__":
    import sys, json
    if len(sys.argv)==2 and sys.argv[1].endswith(".csv"):
        df = pd.read_csv(sys.argv[1])
        X = df[feature_names].values
        p = rf_cal.predict_proba(X)[:,1]
        out = df.copy()
        out["rf_prob"] = p
        out.to_csv("rf_scored.csv", index=False)
        print("Wrote rf_scored.csv")
    else:
        # read one JSON dict from stdin
        feats = json.loads(sys.stdin.read())
        print(json.dumps(score_features(feats), indent=2))
