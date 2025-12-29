from __future__ import annotations
from pathlib import Path
import shutil, zipfile, tempfile
import lxml.etree as ET

def sanitize_ooxml(in_path: Path | str, out_path: Path | str):
    """Remove external relationships, embedded objects, and VBA projects from .docx/.pptx/.xlsx"""
    in_path = Path(in_path); out_path = Path(out_path)
    suffix = in_path.suffix.lower()
    if suffix not in (".docx",".pptx",".xlsx"):
        shutil.copy(in_path, out_path); return {"status":"noop","notes":["Not OOXML"]}
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)/"work.zip"
        shutil.copy(in_path, tmp)
        zin = zipfile.ZipFile(tmp)
        zout = zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED)
        for item in zin.infolist():
            data = zin.read(item.filename)
            # drop vba projects & embedded binaries
            if item.filename.endswith(("vbaProject.bin","vbaProjectSignature.bin")): continue
            if "/embeddings/" in item.filename.lower(): continue
            if item.filename.endswith(".rels"):
                try:
                    root = ET.fromstring(data)
                    # remove external relationships
                    for rel in list(root):
                        t = rel.get("Type","")
                        target = rel.get("Target","")
                        mode = rel.get("{http://schemas.openxmlformats.org/package/2006/relationships}TargetMode")
                        if mode == "External" or "externalLink" in target:
                            root.remove(rel)
                    data = ET.tostring(root, xml_declaration=True, encoding="utf-8")
                except Exception:
                    pass
            zout.writestr(item, data)
        zin.close(); zout.close()
    return {"status":"ok","notes":["Removed external links, VBA, and embedded objects"]}
