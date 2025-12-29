from pathlib import Path

# Base paths
BACKEND_ROOT = Path(__file__).resolve().parent
MODELS_DIR   = BACKEND_ROOT / "models"

# Where the API stores outputs (reports & sanitized files)
OUT_DIR      = BACKEND_ROOT / "out"
REPORTS_DIR  = OUT_DIR / "reports"
SANIT_DIR    = OUT_DIR / "sanitized"
for p in (REPORTS_DIR, SANIT_DIR):
    p.mkdir(parents=True, exist_ok=True)

# Optional: limits and CORS
ALLOWED_ORIGINS = ["http://localhost:5173"]
MAX_UPLOAD_MB   = 30
