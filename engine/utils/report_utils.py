from __future__ import annotations
from typing import Any, Dict, List, Tuple
from pathlib import Path
import json, numpy as np, joblib

# optional torch for DL head
try:
    import torch
    TORCH_OK = True
except Exception:
    TORCH_OK = False

# optional SHAP
try:
    import shap
    SHAP_OK = True
except Exception:
    SHAP_OK = False

def load_lgbm(models_dir: Path) -> Any:
    models_dir = Path(models_dir)
    for name in ["lightgbm_calibrated.pkl","lgbm_calibrated.pkl","lightgbm.pkl"]:
        p = models_dir / name
        if p.exists(): return joblib.load(p)
    raise FileNotFoundError("LightGBM model not found.")

def load_rf(models_dir: Path):
    models_dir = Path(models_dir); rf_dir = models_dir / "models_rf"
    rf=et=None; rf_order=[]
    p = rf_dir / "random_forest.joblib"
    if p.exists(): rf = joblib.load(p)
    p = rf_dir / "extratrees.joblib"
    if p.exists(): et = joblib.load(p)
    for q in [rf_dir / "rf_features.json", models_dir / "rf_features.json"]:
        if q.exists():
            data = json.loads(Path(q).read_text(encoding="utf-8"))
            rf_order = data.get("feature_names") or data.get("features") or (data if isinstance(data, list) else [])
            break
    return rf, et, rf_order

def load_feature_order(models_dir: Path) -> List[str]:
    models_dir = Path(models_dir)
    for p in [models_dir / "feature_cols.json", models_dir / "models_rf" / "rf_features.json"]:
        if p.exists():
            data = json.loads(Path(p).read_text(encoding="utf-8"))
            if isinstance(data, dict):
                for k in ("features","feature_names","columns"):
                    if k in data: return list(data[k])
            elif isinstance(data, list):
                return list(data)
    return []

def load_feat_order(models_dir: Path) -> List[str]:
    return load_feature_order(models_dir)

def _as_estimator(obj: Any):
    if obj is None: return None
    if hasattr(obj,"predict_proba"): return obj
    if isinstance(obj, dict):
        for k in ("calibrated","model","estimator","clf","pipeline","best_estimator_","base_estimator"):
            if k in obj:
                est = _as_estimator(obj[k]); 
                if est is not None: return est
        for v in obj.values():
            est = _as_estimator(v)
            if est is not None: return est
        return None
    for attr in ("estimator","base_estimator","best_estimator_"):
        if hasattr(obj, attr):
            est = _as_estimator(getattr(obj, attr))
            if est is not None: return est
    if hasattr(obj,"steps"):
        try:
            for _, step in reversed(obj.steps):
                est = _as_estimator(step)
                if est is not None: return est
        except Exception: pass
    return None

def _vectorize(feats: Dict[str,float], order: List[str]) -> np.ndarray:
    return np.asarray([[feats.get(n,0.0) for n in order]], dtype=float)

def _safe_prob(p): 
    a=np.asarray(p); 
    return float(a[0,1]) if a.ndim==2 and a.shape[1]>=2 else float(a.ravel()[0])

def lgbm_prob(lgbm_obj: Any, feats: Dict[str,float], order: List[str]) -> float:
    est=_as_estimator(lgbm_obj)
    if est is None or not hasattr(est,"predict_proba"): return 0.0
    x=_vectorize(feats,order); return _safe_prob(est.predict_proba(x))

def rf_prob(rf_obj: Any, et_obj: Any, feats: Dict[str,float], order: List[str]) -> float:
    vals=[]
    for obj in (rf_obj, et_obj):
        est=_as_estimator(obj)
        if est is None or not hasattr(est,"predict_proba"): continue
        x=_vectorize(feats,order); vals.append(_safe_prob(est.predict_proba(x)))
    return float(sum(vals)/len(vals)) if vals else 0.5

def dl_prob_from_emb(mlp_path: Path, emb):
    if not TORCH_OK: return 0.0
    try:
        import torch, torch.nn as nn, numpy as np
        class Head(nn.Module):
            def __init__(self, d=384): super().__init__(); self.fc=nn.Linear(d,1)
            def forward(self,x): return self.fc(x)
        m=Head(); state=torch.load(str(mlp_path), map_location="cpu")
        if isinstance(state, dict) and "state_dict" in state: m.load_state_dict(state["state_dict"], strict=False)
        elif isinstance(state, dict): m.load_state_dict(state, strict=False)
        else: m=state
        m.eval(); x=torch.tensor(np.asarray(emb, dtype=np.float32)).view(1,-1)
        with torch.no_grad(): p=torch.sigmoid(m(x)).cpu().numpy().reshape(-1)[0]
        return float(max(0.0,min(1.0,p)))
    except Exception: return 0.0

def rules_prob(feats: Dict[str,float], meta: Dict[str,Any]) -> float:
    score=0.0
    if meta.get("pdf_has_javascript"): score+=0.5
    if meta.get("has_vba_project"): score+=0.4
    if meta.get("embedded_files_count",0)>0: score+=0.2
    if feats.get("pdf_openaction",0): score+=0.1
    if feats.get("ooxml_has_external_rel",0): score+=0.1
    return max(0.0,min(1.0,score))

def blend(p_dl,p_lgbm,p_tree,p_rules):
    wdl,wl,wt,wr = 0.35,0.35,0.20,0.10
    return float((wdl*p_dl)+(wl*p_lgbm)+(wt*p_tree)+(wr*p_rules)) / (wdl+wl+wt+wr)

def severity(prob: float) -> str:
    return "critical" if prob>=0.90 else "high" if prob>=0.70 else "medium" if prob>=0.40 else "low"

def findings_from_meta(meta: Dict[str,Any]) -> List[Dict[str,str]]:
    it=[]
    if meta.get("pdf_has_javascript"):
        it.append({"threat_type":"JavaScript Code","severity":"high","indicator":"PDF /JavaScript or /OpenAction detected","action_taken":"Removed"})
    if meta.get("has_vba_project"):
        it.append({"threat_type":"Macro Function","severity":"high","indicator":"vbaProject.bin present","action_taken":"Neutralized"})
    if meta.get("embedded_files_count",0)>0:
        it.append({"threat_type":"Embedded Content","severity":"medium","indicator":f"{meta.get('embedded_files_count')} embedded file(s)","action_taken":"Stripped"})
    if not it:
        it.append({"threat_type":"No active threats","severity":"low","indicator":"No dangerous constructs found","action_taken":"N/A"})
    return it

def shap_top(est_obj: Any, feats: Dict[str,float], order: List[str], k: int = 6):
    if not SHAP_OK: return {"support": False}
    est=_as_estimator(est_obj)
    if est is None: return {"support": False}
    try:
        x = _vectorize(feats, order)
        explainer = shap.Explainer(est, feature_names=order)
        values = explainer(x).values[0]  # SHAP contributions per feature
        pairs = list(zip(order, values))
        pairs.sort(key=lambda t: t[1], reverse=True)
        pos = [{"name":n,"shap":float(v)} for n,v in pairs if v>0][:k]
        neg = [{"name":n,"shap":float(v)} for n,v in pairs if v<0][:k]
        return {"support": True, "positive": pos, "negative": neg}
    except Exception:
        return {"support": False}

def nlg_explain(verdict: str, risk: float, model_scores: Dict[str,float], findings: List[Dict[str,str]]) -> str:
    bits=[]
    bits.append(f"The file was classified as **{verdict}** with a risk score of {risk:.2f}.")
    parts=[]
    if "p_dl" in model_scores: parts.append(f"DL={model_scores['p_dl']:.2f}")
    if "p_lgbm" in model_scores: parts.append(f"LGBM={model_scores['p_lgbm']:.2f}")
    if "p_tree" in model_scores: parts.append(f"Tree={model_scores['p_tree']:.2f}")
    if "p_rules" in model_scores: parts.append(f"Rules={model_scores['p_rules']:.2f}")
    if parts: bits.append("Model signals: " + ", ".join(parts) + ".")
    if findings:
        why = "; ".join([f"{f['threat_type']} ({f['indicator']})" for f in findings if f.get("threat_type") and f.get("indicator")])
        bits.append("Key reasons: " + why + ".")
    return " ".join(bits)

def confidence(model_scores: Dict[str,float]) -> Dict[str,Any]:
    dl=model_scores.get("p_dl",0.0); l=model_scores.get("p_lgbm",0.0); t=model_scores.get("p_tree",0.0); r=model_scores.get("p_rules",0.0)
    disagree = max(dl,l,t,r) - min(dl,l,t,r)
    level = "low" if disagree>0.45 else "medium" if disagree>0.25 else "high"
    why = "Models disagree strongly" if level=="low" else "Some disagreements among models" if level=="medium" else "Models broadly agree"
    return {"level": level, "spread": round(float(disagree),3), "why": why}
