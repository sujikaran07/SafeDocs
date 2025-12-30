"""
SafeDocs PDF Sanitizer — Surgical Cleaning with pikepdf (QPDF)
Prioritizes in-place sanitization to preserve document fidelity while neutralizing threats.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, List, Any
import io, re, shutil, hashlib, tempfile

# Try importing pikepdf (preferred engine)
try:
    import pikepdf
except ImportError:
    pikepdf = None

# Always need PyPDF2 as fallback
try:
    from PyPDF2 import PdfReader, PdfWriter
    from PyPDF2.generic import NameObject, ArrayObject
except Exception as e:
    raise RuntimeError("PyPDF2 is required for PDF sanitization") from e

def _sha256(b: bytes) -> str:
    h = hashlib.sha256(); h.update(b); return h.hexdigest()

def _sanitize_with_pikepdf(in_path: Path, out_path: Path) -> Dict[str, Any]:
    """
    Recursively remove JS and Actions from ALL objects using QPDF/pikepdf.
    This finds threats hidden deep in the PDF structure.
    """
    removed = []
    stats = {"js": 0, "actions": 0, "annotations": 0}
    
    with pikepdf.open(str(in_path), allow_overwriting_input=True) as pdf:
        # Define dangerous keys and values to hunt for
        DANGEROUS_KEYS = ["/AA", "/OpenAction", "/JS", "/JavaScript", "/Launch", "/SubmitForm", "/ImportData", "/RichMedia", "/RichMediaContent"]
        
        # Recursive walker to clean any dictionary object found
        def clean_object(obj, path=""):
            if isinstance(obj, pikepdf.Dictionary):
                # 1. Check for dangerous keys
                for key in list(obj.keys()):
                    if key in DANGEROUS_KEYS:
                        del obj[key]
                        removed.append(f"{path}{key}")
                        stats["js" if "JS" in key or "Script" in key else "actions"] += 1
                
                # 2. Check for dangerous Actions (/A)
                if "/A" in obj:
                    action = obj.get("/A")
                    if isinstance(action, pikepdf.Dictionary) and "/S" in action:
                        subtype = str(action.get("/S"))
                        if subtype in ["/JavaScript", "/Launch", "/SubmitForm", "/ImportData"]:
                            del obj["/A"]
                            removed.append(f"{path}/A{subtype}")
                            stats["actions"] += 1

                # Recurse into children
                for key, val in obj.items():
                    # Limit recursion depth implicitly by object graph structure
                    clean_object(val, f"{path}{key}/")
            
            elif isinstance(obj, pikepdf.Array):
                for i, item in enumerate(obj):
                    clean_object(item, f"{path}[{i}]/")

        # Start recursion from Root
        clean_object(pdf.root, "Root")

        # Also iterate over all objects in the PDF body to catch unlinked but present threats
        # (This is expensive but thorough)
        for obj in pdf.objects:
             clean_object(obj, "Obj")

        # Save with full rewrite to purge deleted data
        pdf.save(str(out_path), object_stream_mode=pikepdf.ObjectStreamMode.generate)

    return {
        "status": "ok",
        "sanitized_file": str(out_path),
        "removed": list(set(removed)),
        "notes": ["Sanitized with pikepdf (Recursive)"],
        "stats": stats
    }

def _sanitize_with_pypdf(in_path: Path, out_path: Path) -> Dict[str, Any]:
    """Fallback: Rebuild PDF with PyPDF2 (More thorough but riskier for complex docs)"""
    removed: List[str] = []
    stats: Dict[str, int] = {"js": 0, "actions": 0, "annotations": 0}
    
    reader = PdfReader(str(in_path))
    writer = PdfWriter()

    # Catalog
    root = reader.trailer.get("/Root")
    if root:
        if "/OpenAction" in root:
            del root["/OpenAction"]; removed.append("OpenAction")
        if "/AA" in root:
            del root["/AA"]; removed.append("Catalog.AA")
        if "/Names" in root and "/JavaScript" in root["/Names"]:
             del root["/Names"]["/JavaScript"]; removed.append("Names.JavaScript")

    # Pages
    for page in reader.pages:
        if "/AA" in page:
             del page["/AA"]; removed.append("Page.AA")
        
        # Annotations (Surgical)
        if "/Annots" in page:
            try:
                annots = page["/Annots"]
                if isinstance(annots, list):
                    safe = []
                    for a in annots:
                         a_obj = a.get_object() if hasattr(a, "get_object") else a
                         if not any(k in a_obj for k in ["/JavaScript", "/JS", "/AA"]):
                             safe.append(a)
                         else:
                             stats["annotations"] += 1
                    if len(safe) < len(annots):
                        page[NameObject("/Annots")] = ArrayObject(safe)
            except Exception: pass
        
        writer.add_page(page)

    with open(out_path, "wb") as f:
        writer.write(f)

    return {
        "status": "ok", 
        "sanitized_file": str(out_path), 
        "removed": removed,
        "notes": ["Sanitized with PyPDF2 (Fallback)"],
        "stats": stats
    }

def sanitize_pdf(in_path: str | Path, out_path: str | Path):
    in_path = Path(in_path); out_path = Path(out_path)
    
    # Try pikepdf first (High Fidelity)
    if pikepdf:
        try:
            return _sanitize_with_pikepdf(in_path, out_path)
        except Exception as e:
            print(f"⚠️ pikepdf failed: {e}, falling back to PyPDF2")
    
    # Fallback to PyPDF2
    try:
        return _sanitize_with_pypdf(in_path, out_path)
    except Exception as e:
         # Absolute fail-safe: Copy original if both fail, but mark as error
         shutil.copy(in_path, out_path)
         return {"status": "failed", "error": str(e)}

def sanitize_pdf_bytes(data: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as td:
        ip = Path(td) / "in.pdf"
        op = Path(td) / "out.pdf"
        ip.write_bytes(data)
        res = sanitize_pdf(ip, op)
        if res["status"] == "ok":
            return op.read_bytes()
        return data
