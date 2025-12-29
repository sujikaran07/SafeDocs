"""
SafeDocs Engine - Main Entry Point
Runs the FastAPI server for file scanning and sanitization.
"""

import sys
from pathlib import Path

# Add subdirectories to path
engine_dir = Path(__file__).parent
sys.path.insert(0, str(engine_dir / "api"))
sys.path.insert(0, str(engine_dir / "core"))
sys.path.insert(0, str(engine_dir / "sanitizers"))
sys.path.insert(0, str(engine_dir / "utils"))

# Import and run the API server
from api_stateless import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
