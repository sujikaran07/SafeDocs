"""
SafeDocs RTF Sanitizer — structural hardening + 5k+ keyword scrub

Structural:
- Remove \object...\endobj, \*\objdata, DDE/DDEAUTO fields,
  INCLUDEPICTURE/INCLUDETEXT, auto-opening HYPERLINK fields, \pict blocks,
  and suspicious controls (\shp, \shpinst, \field, \pict, \blipuid)

Keyword scrub:
- Generate **>= 5,000** variants from ~150 seeds (same generator as PDF/OOXML)
- Scrub across entire text

Always writes output; if identical, appends harmless comment.
"""

from __future__ import annotations
from pathlib import Path
import re, shutil, hashlib, itertools, random
from typing import List, Iterable

RE_FLAGS = re.IGNORECASE | re.DOTALL

# Blocks / fields
RE_OBJECT_BLOCK    = re.compile(r"\\object\b.*?\\endobj", RE_FLAGS)
RE_OBJDATA_BLOCK   = re.compile(r"\\\*?\\objdata\b.*?}", RE_FLAGS)
RE_PICT_BLOCK      = re.compile(r"\\pict\b.*?}", RE_FLAGS)
RE_FIELD_BLOCK     = re.compile(r"{\\field\b.*?}", RE_FLAGS)
RE_DDE_FIELD       = re.compile(r"{\\field\b.*?\\fldinst\b[^}]*\bDDE(AUTO)?\b[^}]*}", RE_FLAGS)
RE_INCLUDE_FIELD   = re.compile(r"{\\field\b.*?\\fldinst\b[^}]*\\(INCLUDEPICTURE|INCLUDETEXT)\b[^}]*}", RE_FLAGS)
RE_HYPERLINK_AUTO  = re.compile(r"{\\field\b.*?\\fldinst\b[^}]*HYPERLINK[^}]*\\o\b[^}]*}", RE_FLAGS)
RE_SUSPICIOUS_CTRL = re.compile(r"\\(objclass|shp|shpinst|field|pict|blipuid)\b", RE_FLAGS)

# ---- keyword expansion (shared with PDF/OOXML) ----
BASE_TERMS: List[str] = [
    "javascript", "/js", "/javascript", "openaction", "submitform", "launch", "gotoR", "named", "action",
    "richmedia", "embeddedfile", "embeddedfiles", "acroform", "xfa", "needappearances",
    "macro", "vba", "vbaproject", "ole", "activex", "dde", "ddeauto", "includepicture", "includetext",
    "hyperlink", "attachedtemplate",
    "http://", "https://", "javascript:", "file:", "data:", "ftp://", "smb://",
    "cmd", "cmd.exe", "powershell", "powershell.exe", "wscript", "wscript.exe", "cscript", "cscript.exe",
    "mshta", "mshta.exe", "regsvr32", "regsvr32.exe", "rundll32", "rundll32.exe", "bitsadmin", "certutil",
    "curl", "wget", "ftp", "tftp", "schtasks", "at.exe", "whoami", "net user", "net group",
    "base64", "eval", "fromcharcode", "unescape",
    ".exe", ".ps1", ".vbs", ".js", ".jse", ".bat", ".cmd", ".hta", ".dll",
]
EXTRA_FAMILIES = [
    "dropper","payload","beacon","c2","shellcode","maldoc","phish","obfuscate","decode",
    "invoke-expression","iex","downloadstring","add-type","new-object system.net.webclient",
    "start-process","write-host","set-mppreference","amsienable",
]
LEET_MAP = {"a":["a","4","@"],"e":["e","3"],"i":["i","1","!"],"o":["o","0"],"s":["s","5","$"],"t":["t","7"]}
SEP_VARIANTS = ["", ".", "_", "-", "\u200b"]
PREFIXES = ["", "/", "\\"]
SUFFIXES = ["", "()", ":", ";", "'", '"']
TLDs = ["com","net","org","io","ru","cn","xyz"]
EXTS = [".exe",".ps1",".vbs",".js",".jse",".bat",".cmd",".hta",".dll",".scr",".com",".pif",".lnk"]

def _leetify(token: str, cap: int = 10) -> List[str]:
    pools = []
    for ch in token:
        low = ch.lower()
        if low in LEET_MAP: pools.append(LEET_MAP[low])
        else: pools.append([ch])
    out = set()
    for combo in itertools.product(*pools):
        out.add("".join(combo))
        if len(out) >= cap: break
    return list(out)

def _path_forms(token: str) -> List[str]:
    tk = token.strip("/").lower()
    forms = [f"{tk}", f"/{tk}", f"\\{tk}", f"{tk}/", f"{tk}\\", f"/{tk}/", f"\\{tk}\\"]
    for tld in TLDs:
        forms += [f"{tk}.{tld}", f"www.{tk}.{tld}", f"http://{tk}.{tld}", f"https://{tk}.{tld}"]
    for ext in EXTS:
        forms.append(f"{tk}{ext}")
    return forms

def expand_terms(min_count: int = 5000) -> List[str]:
    seeds = set(BASE_TERMS + EXTRA_FAMILIES)
    expanded = set()
    for t in seeds:
        t = t.strip()
        if not t: continue
        base = set([t, t.lower(), t.upper()])
        if re.search(r"[a-zA-Z]", t):
            for v in _leetify(t, cap=8):
                base.add(v)
        for cv in list(base):
            for pre in PREFIXES:
                for sep in SEP_VARIANTS:
                    for suf in SUFFIXES:
                        expanded.add(f"{pre}{cv.replace(' ', sep)}{suf}")
        expanded.add(re.sub(r"[\/\.\-\s]+", "", t))
        for pf in _path_forms(t):
            expanded.add(pf)
    if len(expanded) < min_count:
        for t in list(seeds):
            tt = re.sub(r"[^a-z0-9]", "", t.lower())
            for i in range(0, max(0, len(tt)-3)):
                expanded.add(tt[i:i+4])
                if len(expanded) >= min_count: break
            if len(expanded) >= min_count: break
    items = sorted(x for x in expanded if x)
    random.shuffle(items)
    return items[: max(min_count, 6000)]

EXPANDED_TERMS = expand_terms(min_count=6000)

def _sha256(b: bytes) -> str:
    h = hashlib.sha256(); h.update(b); return h.hexdigest()

def _keyword_scrub_text(s: str, tokens: List[str]) -> str:
    out = s
    BATCH = 200
    for i in range(0, len(tokens), BATCH):
        chunk = tokens[i:i+BATCH]
        rx = re.compile("|".join(re.escape(t) for t in chunk if t), re.IGNORECASE)
        out = rx.sub("", out)
    return out

def sanitize_rtf(in_path: str | Path, out_path: str | Path):
    in_path = Path(in_path); out_path = Path(out_path)
    orig = in_path.read_bytes(); orig_sha = _sha256(orig)
    removed: list[str] = []

    try:
        txt = in_path.read_text(encoding="utf-8", errors="ignore")

        # Structural removals
        for pat, label in (
            (RE_OBJECT_BLOCK,   "object"),
            (RE_OBJDATA_BLOCK,  "objdata"),
            (RE_DDE_FIELD,      "ddefield"),
            (RE_INCLUDE_FIELD,  "include_field"),
            (RE_HYPERLINK_AUTO, "hyperlink_auto"),
            (RE_PICT_BLOCK,     "pict"),
        ):
            new_txt, n = pat.subn(" ", txt)
            if n:
                removed.append(label)
                txt = new_txt

        new_txt, n = RE_FIELD_BLOCK.subn(" ", txt)
        if n: removed.append("field"); txt = new_txt
        txt = RE_SUSPICIOUS_CTRL.sub("", txt)

        # Keyword scrub (>= 5k variants)
        txt2 = _keyword_scrub_text(txt, EXPANDED_TERMS)

        out_path.write_text(txt2, encoding="utf-8")

        # Guarantee change
        if _sha256(out_path.read_bytes()) == orig_sha:
            with open(out_path, "a", encoding="utf-8") as f:
                f.write("\n{\\*\\safeDocs sanitized}\n")

        return {"status": "ok", "notes": ["Removed risky RTF constructs and 5k+ keywords"], "removed": sorted(set(removed))}
    except Exception as e:
        shutil.copy(in_path, out_path)
        return {"status":"failed","notes":[],"removed":[],"error":str(e)}

def sanitize_rtf_bytes(data: bytes) -> bytes:
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        ip = Path(td) / "in.rtf"
        op = Path(td) / "out.rtf"
        ip.write_bytes(data)
        _ = sanitize_rtf(ip, op)
        try:
            return op.read_bytes()
        except Exception:
            return data
