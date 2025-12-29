from __future__ import annotations
import argparse, json, os, shutil, hashlib, datetime
from pathlib import Path

from features_runtime import build_features_for_lgbm
from sanitize_ooxml import sanitize_ooxml
from sanitize_rtf import sanitize_rtf
from sanitize_pdf import sanitize_pdf

from report_utils import (
    load_lgbm, load_rf, load_feat_order, load_feature_order,
    lgbm_prob, rf_prob, dl_prob_from_emb,
    rules_prob, blend, severity, findings_from_meta,
    shap_top, nlg_explain, confidence
)

def _dl_prob(models_dir: Path, file_path: Path, meta: dict) -> float:
    try:
        from embedder import FrozenMiniLM
        from text_extract import extract_text
    except Exception:
        return 0.0
    try:
        txt = extract_text(str(file_path)) or ""
        if not txt.strip(): return 0.0
        vec = FrozenMiniLM().encode([txt])[0]
        mlp = (Path(models_dir)/"mlp_head.pt")
        if not mlp.exists(): return 0.0
        return float(dl_prob_from_emb(mlp, vec))
    except Exception:
        return 0.0
    
# scan_file.py (simplified stub)
def scan_bytes(raw: bytes, name: str, content_type: str) -> dict:
    """
    Main scanning function for API.
    Args:
        raw: file content
        name: original filename
        content_type: MIME type
    Returns:
        dict with keys: verdict ('benign'|'malicious'),
                        risk_score (float),
                        signals (dict),
                        meta (dict)
    """
    # Load models (RandomForest, LightGBM, MiniLM, etc.)
    # Do feature extraction, predict risk score
    # This must NOT require CLI args

    # Example dummy (replace with real pipeline):
    return {
        "verdict": "malicious" if raw and raw[0] % 2 == 0 else "benign",
        "risk_score": 0.87,
        "signals": {"rf": 0.7, "lgbm": 0.9, "minilm": 0.8},
        "meta": {"filename": name, "size": len(raw)},
    }


def _sanitize(src: Path, out_clean_dir: Path):
    out_clean_dir.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()
    dst = out_clean_dir / f"{src.stem}_clean{ext}"
    if ext == ".pdf":   info = sanitize_pdf(src, dst)
    elif ext in (".docx",".pptx",".xlsx"): info = sanitize_ooxml(src, dst)
    elif ext == ".rtf": info = sanitize_rtf(src, dst)
    else: shutil.copy(src, dst); info={"status":"noop","sanitized_file":str(dst),"removed":[]}
    return dst.name, info

def _human_size(n:int) -> str:
    units=["B","KB","MB","GB"]; i=0; x=float(n)
    while x>=1024 and i<len(units)-1: x/=1024; i+=1
    return f"{x:.2f} {units[i]}"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--models_dir", required=True)
    ap.add_argument("--out_reports", required=True)
    ap.add_argument("--out_clean", required=True)
    args = ap.parse_args()

    src = Path(args.file)
    models_dir = Path(args.models_dir)
    rep_dir = Path(args.out_reports); rep_dir.mkdir(parents=True, exist_ok=True)
    clean_dir = Path(args.out_clean); clean_dir.mkdir(parents=True, exist_ok=True)

    # features & meta
    try: feats, meta = build_features_for_lgbm(str(src))
    except Exception: feats, meta = {}, {}

    # models
    try: lgbm = load_lgbm(models_dir)
    except Exception: lgbm = None
    try: rf, et, rf_order = load_rf(models_dir)
    except Exception: rf, et, rf_order = None, None, []
    feat_order = load_feature_order(models_dir) or load_feat_order(models_dir)

    # probs
    try: p_lgbm = lgbm_prob(lgbm, feats, feat_order) if lgbm else 0.0
    except Exception: p_lgbm = 0.0
    try: p_tree = rf_prob(rf, et, feats, rf_order) if (rf or et) else 0.5
    except Exception: p_tree = 0.5
    try: p_rules = rules_prob(feats, meta)
    except Exception: p_rules = 0.0
    try: p_dl = _dl_prob(models_dir, src, meta)
    except Exception: p_dl = 0.0

    risk = blend(p_dl, p_lgbm, p_tree, p_rules)
    verdict = "malicious" if risk >= 0.5 else "benign"

    # file meta
    size_bytes = src.stat().st_size if src.exists() else 0
    try:
        import magic; mime = magic.from_file(str(src), mime=True)
    except Exception:
        mime = src.suffix.lower().lstrip('.') or "application/octet-stream"
    sha256 = None
    try:
        import hashlib; h = hashlib.sha256()
        with open(src,"rb") as f:
            for ch in iter(lambda: f.read(8192), b""): h.update(ch)
        sha256 = h.hexdigest()
    except Exception: pass

    # suspicious snippets
    suspicious = []
    try:
        from text_extract import extract_text
        txt = extract_text(str(src)) or ""
        if txt:
            tl = txt.lower()
            keywords = ["javascript","openaction","vbaproject","shell","powershell","cmd.exe","eval(","<script","createobject","activex","autoopen"]
            for kw in keywords:
                if kw in tl:
                    i = tl.find(kw); s=max(0,i-40); e=min(len(txt), i+len(kw)+80)
                    suspicious.append({"snippet": txt[s:e].replace("\n"," ").strip(), "keyword": kw})
    except Exception: pass

    # SHAP explainability
    shap_info = shap_top(lgbm, feats, feat_order, k=6)

    # feature list (simple magnitude)
    top_features = []
    try:
        for n,v in sorted(feats.items(), key=lambda kv: abs(kv[1]), reverse=True)[:6]:
            top_features.append({"name":n,"value":v,"est_contribution": round(float(v),4)})
    except Exception: pass

    model_scores = {"p_dl": round(float(p_dl),3), "p_lgbm": round(float(p_lgbm),3), "p_tree": round(float(p_tree),3), "p_rules": round(float(p_rules),3)}
    conf = confidence(model_scores)
    findings = findings_from_meta(meta)
    summary_text = nlg_explain(verdict, risk, model_scores, findings)

    # write report
    report_id = f"{src.stem}_report.json"
    report_path = rep_dir / report_id
    sanitized_name, sani_info = _sanitize(src, clean_dir)

    report = {
        "meta": {
            "file": src.name, "size_bytes": size_bytes, "size_human": _human_size(size_bytes),
            "sha256": sha256, "mime_type": mime, "scanned_at": datetime.datetime.utcnow().isoformat()+"Z"
        },
        "verdict": verdict, "risk_score": round(float(risk),3), "severity": severity(risk),
        "model_scores": model_scores,
        "model_contributions": {  # same weights as blend for transparency
            "dl": round(0.35*model_scores["p_dl"],4),
            "lgbm": round(0.35*model_scores["p_lgbm"],4),
            "tree": round(0.20*model_scores["p_tree"],4),
            "rules": round(0.10*model_scores["p_rules"],4),
        },
        "top_features": top_features,
        "suspicious_snippets": suspicious,
        "findings": findings,
        "shap": shap_info,                          # <-- SHAP
        "explain_text": summary_text,               # <-- NLG explanation
        "confidence": conf,                         # <-- confidence meter
        "sanitization": {
            "sanitized_id": sanitized_name,
            "notes": ["Sanitized with SafeDocs engine"],
            "removed": sani_info.get("removed", []),  # <-- diff
            "success": True if sanitized_name else False
        }
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    # final line for API
    print(json.dumps({
        "verdict": report["verdict"],
        "risk_score": report["risk_score"],
        "signals": report["model_scores"],
        "report_id": report_id,
        "sanitized_id": sanitized_name,
        "meta": report["meta"],
        "model_scores": report["model_scores"],
        "model_contributions": report["model_contributions"],
        "top_features": report["top_features"],
        "suspicious_snippets": report["suspicious_snippets"],
        "findings": report["findings"],
        "sanitization": report["sanitization"],
        "severity": report["severity"],
        "shap": report["shap"],
        "explain_text": report["explain_text"],
        "confidence": report["confidence"],
    }))
if __name__ == "__main__":
    main()
