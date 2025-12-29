"""
Direct Engine Test - Bypass the database
"""
import requests

# Test the malicious file
with open("testing/malicious_sample.pdf", "rb") as f:
    files = {"file": ("malicious_sample.pdf", f, "application/pdf")}
    response = requests.post("http://localhost:8000/scan", files=files)
    
result = response.json()

print("\n" + "="*70)
print("SCAN RESULT FOR: malicious_sample.pdf")
print("="*70)
print(f"Verdict: {result.get('verdict', 'N/A')}")
print(f"Risk Score: {result.get('risk_score', 0):.2%}")
print(f"Sanitized: {result.get('sanitized', False)}")
print(f"Clean Risk: {result.get('clean_risk_score', 0):.2%}")
print("\nFindings:")
for finding in result.get('findings', []):
    print(f"  - [{finding.get('severity')}] {finding.get('title')}: {finding.get('message')}")
print("="*70)
