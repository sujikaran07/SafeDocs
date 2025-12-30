
import sys
import os

# Add engine directories to path
sys.path.append(os.path.abspath("engine"))
sys.path.append(os.path.abspath("engine/core"))
sys.path.append(os.path.abspath("engine/sanitizers"))

from core.scan_file import scan_bytes

# 1. Test PDF with Regex Trigger
print("--- TEST 1: PDF Regex Trigger ---")
# "JavaScript" keyword should trigger the fallback regex
dummy_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /OpenAction << /S /JavaScript /JS (app.alert('pwn')) >> >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"

res = scan_bytes(dummy_pdf, "test.pdf")
print(f"Verdict: {res['verdict']}")
print(f"Risk Score: {res['risk_score']}")
print(f"Model Scores: {res['model_scores']}")
print(f"Findings: {res['findings']}")

# 2. Test Safe PDF
print("\n--- TEST 2: Safe PDF ---")
safe_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF"
res2 = scan_bytes(safe_pdf, "safe.pdf")
print(f"Verdict: {res2['verdict']}")
print(f"Model Scores: {res2['model_scores']}")
