# features_runtime.py - Runtime feature extraction and ML prediction
from pathlib import Path
import tempfile
import os
import json
import math

# Try to load the trained model
_MODEL = None
_CALIBRATOR = None
_FEATURE_COLS = None

try:
    import joblib
    # Fix: models are in engine/models, not engine/core/models
    models_dir = Path(__file__).parent.parent / "models"
    model_path = models_dir / "lightgbm_calibrated.pkl"
    
    if model_path.exists():
        loaded = joblib.load(model_path)
        
        # The pickle file is a dict with keys: model, calibrator, feature_cols
        if isinstance(loaded, dict):
            _MODEL = loaded.get('model')
            _CALIBRATOR = loaded.get('calibrator')
            _FEATURE_COLS = loaded.get('feature_cols')
            print(f"✓ Loaded LightGBM model: {type(_MODEL)}")
            print(f"✓ Feature columns: {len(_FEATURE_COLS) if _FEATURE_COLS else 0}")
        else:
            # Fallback: treat as direct model
            _MODEL = loaded
            # Try to load feature_cols separately
            feature_cols_path = models_dir / "feature_cols.json"
            if feature_cols_path.exists():
                with open(feature_cols_path, 'r') as f:
                    _FEATURE_COLS = json.load(f)
    except Exception as e:
        _LOAD_ERROR = str(e)
        print(f"Warning: Could not load LightGBM model: {e}")

def sniff_meta_from_bytes(data: bytes, ext: str = ""):
    """Extract metadata from bytes"""
    meta = {"mime": f"application/{ext.lstrip('.')}", "pages": 0}
    
    # PDF analysis
    if ext == ".pdf" or (len(data) > 100 and b"%PDF" in data[:100]):
        meta["pdf_has_javascript"] = any(x in data for x in [b"/JavaScript", b"/OpenAction", b"/AA", b"/Launch"])
        # Try to count pages (simple heuristic)
        try:
            page_count = data.count(b"/Type/Page") + data.count(b"/Type /Page")
            meta["pages"] = page_count
        except:
            meta["pages"] = 1
    
    # OOXML analysis (docx, xlsx, pptx)
    elif ext in (".docx", ".xlsx", ".pptx"):
        try:
            import zipfile, io
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                names = z.namelist()
                meta["has_vba_project"] = any("vbaProject.bin" in n for n in names)
                meta["embedded_ole_count"] = sum(1 for n in names if "/embeddings/" in n or "oleObject" in n)
        except:
            meta["has_vba_project"] = False
            meta["embedded_ole_count"] = 0
    
    # RTF analysis
    elif ext == ".rtf" or (len(data) > 6 and data[:6] == b"{\\rtf1"):
        text = data[:100000].decode("latin-1", errors="ignore")
        meta["has_embedded_objects"] = "\\objdata" in text or "\\object" in text
    
    return meta

def calculate_entropy(data: bytes, max_bytes: int = 65536) -> float:
    """Calculate Shannon entropy"""
    if not data:
        return 0.0
    sample = data[:max_bytes]
    freq = [0] * 256
    for b in sample:
        freq[b] += 1
    h = 0.0
    n = len(sample)
    for c in freq:
        if c:
            p = c / n
            h -= p * math.log2(p)
    return min(1.0, h / 8.0)

def build_features_for_lgbm(data=None, filename: str = "", ext: str = "", path: Path = None):
    """
    Build features and get ML prediction.
    Returns dict with P_LGBM. Includes 'error' key if model failed to load.
    """
    try:
        if _LOAD_ERROR:
            # Don't return P_LGBM=0.0, return error dict so heuristics can take over
            return {"error": f"Model load failed: {_LOAD_ERROR}"}
        
        # Handle both path and bytes input
        if path and isinstance(path, Path):
            data = path.read_bytes()
            if not ext:
                ext = path.suffix.lower()
            if not filename:
                filename = path.name
        
        if data is None:
            return {}
        
        # Extract metadata
        meta = sniff_meta_from_bytes(data, ext)
        size = len(data)
        entropy = calculate_entropy(data)
        
        # Build feature dict
        features = {
            "size_bytes": float(size),
            "entropy": float(entropy),
            "pdf_has_javascript": 1.0 if meta.get("pdf_has_javascript") else 0.0,
            "has_vba_project": 1.0 if meta.get("has_vba_project") else 0.0,
            "embedded_ole_count": float(meta.get("embedded_ole_count", 0)),
            "page_count": float(meta.get("pages", 0)),
            "has_embedded_objects": 1.0 if meta.get("has_embedded_objects") else 0.0,
        }
        
        # If ML model is available, get prediction
        if _MODEL and _FEATURE_COLS:
            # Align features to model's expected columns
            feature_vector = []
            for col in _FEATURE_COLS:
                feature_vector.append(features.get(col, 0.0))
            
            # Get prediction
            try:
                import numpy as np
                X = np.array([feature_vector])
                
                # Get raw prediction from model
                if hasattr(_MODEL, 'predict_proba'):
                    raw_prob = _MODEL.predict_proba(X)[0][1]  # Probability of malicious class
                else:
                    raw_prob = _MODEL.predict(X)[0]
                
                # Apply calibration if available
                if _CALIBRATOR and hasattr(_CALIBRATOR, 'predict_proba'):
                    # Calibrator expects 2D array with shape (n_samples, n_classes)
                    proba_2d = _MODEL.predict_proba(X)
                    calibrated_prob = _CALIBRATOR.predict_proba(proba_2d)[0][1]
                    prob = calibrated_prob
                else:
                    prob = raw_prob
                
                features["P_LGBM"] = float(prob)
            except Exception as e:
                features["error"] = f"Prediction failed: {e}"
        else:
            if not _MODEL:
                features["error"] = "Model not loaded (unknown reason)"
        
        return features
        
    except Exception as e:
        return {"error": f"Feature extraction crash: {e}"}
