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
    Surgically remove JS and Actions using QPDF/pikepdf.
    This preserves the PDF structure (XRefs, uncompressed streams) much better than re-building.
    """
    removed = []
    stats = {"js": 0, "actions": 0, "annotations": 0}
    
    with pikepdf.open(str(in_path), allow_overwriting_input=True) as pdf:
        # 1. Clean Root / Catalog
        root = pdf.root
        if "/OpenAction" in root:
            del root["/OpenAction"]
            removed.append("OpenAction")
            stats["actions"] += 1
        if "/AA" in root:
            del root["/AA"]
            removed.append("Catalog.AA")
            stats["actions"] += 1
        
        # 2. Clean Names (Embedded JS)
        if "/Names" in root and "/JavaScript" in root["/Names"]:
            del root["/Names"]["/JavaScript"]
            removed.append("Names.JavaScript")
            stats["js"] += 1

        # 3. Clean AcroForm (Form Actions)
        if "/AcroForm" in root:
            acro = root["/AcroForm"]
            # Remove only dangerous keys, leave fields intact if possible
            for k in ["/JS", "/JavaScript", "/AA"]:
                if k in acro:
                    del acro[k]
                    removed.append(f"AcroForm{k}")
                    stats["js" if "JS" in k else "actions"] += 1
            # Note: We keep /XFA for now as removing it breaks modern forms,
            # unless we detect it specifically has malicious scripts.
            # (Future: parse XFA xml to sanitize it)

        # 4. Clean Pages (Page Actions & Annotations)
        for page in pdf.pages:
            # Page Actions
            if "/AA" in page:
                del page["/AA"]
                removed.append("Page.AA")
                stats["actions"] += 1
            
            # Annotations
            if "/Annots" in page:
                annots = page["/Annots"]
                # Iterate backwards to delete safely
                for i in range(len(annots) - 1, -1, -1):
                    try:
                        a = annots[i]
                        # Check logic: Actions or JS
                        is_bad = False
                        if "/A" in a: # Action dictionary
                            action = a["/A"]
                            if "/S" in action and action["/S"] in ["/JavaScript", "/Launch", "/SubmitForm", "/ImportData"]:
                                is_bad = True
                        if "/AA" in a: # Additional Actions
                            is_bad = True
                        
                        if is_bad:
                            del annots[i]
                            stats["annotations"] += 1
                    except Exception:
                        pass

        # 5. Metadata Scrub (Optional but good)
        if "/Metadata" in root:
           del root["/Metadata"]
        
        # Save
        pdf.save(str(out_path))

    return {
        "status": "ok",
        "sanitized_file": str(out_path),
        "removed": list(set(removed)),
        "notes": ["Sanitized with pikepdf (Surgical)"],
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
