# schemas.py
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ScanResult(BaseModel):
    ok: bool = True
    verdict: str
    risk_score: float
    model_scores: Optional[Dict[str, float]] = None
    meta: Optional[Dict[str, Any]] = None
    report_id: Optional[str] = None
    sanitized_id: Optional[str] = None
    report_api: Optional[str] = None
    download_api: Optional[str] = None
    timestamp: datetime
