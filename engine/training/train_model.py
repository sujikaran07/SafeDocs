"""
SafeDocs Quick Training Script
Creates a small synthetic dataset and trains the model
"""
import os
import shutil
from pathlib import Path

# Step 1: Create Dataset Structure
print("[1/5] Creating dataset structure...")
dataset_root = Path("E:/SafeDocs_Datasets_ML/safedocs_dataset")
benign_dir = dataset_root / "raw/office_pdf/benign"
malicious_dir = dataset_root / "raw/office_pdf/malicious"

benign_dir.mkdir(parents=True, exist_ok=True)
malicious_dir.mkdir(parents=True, exist_ok=True)

# Step 2: Copy test files
print("[2/5] Copying test samples...")
test_dir = Path("testing")
if (test_dir / "safe_sample.pdf").exists():
    shutil.copy(test_dir / "safe_sample.pdf", benign_dir / "safe_sample.pdf")
if (test_dir / "malicious_sample.pdf").exists():
    shutil.copy(test_dir / "malicious_sample.pdf", malicious_dir / "malicious_sample.pdf")

# Step 3: Generate more synthetic samples
print("[3/5] Generating synthetic training data...")

def create_benign_pdf(name):
    content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000110 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    )
    with open(benign_dir / name, "wb") as f:
        f.write(content)

def create_malicious_pdf(name, payload_type="js"):
    if payload_type == "js":
        content = (
            b"%PDF-1.4\n"
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R /OpenAction 4 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
            b"4 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert('Exploit')) >>\nendobj\n"
            b"xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000080 00000 n \n0000000130 00000 n \n0000000200 00000 n \n"
            b"trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n280\n%%EOF"
        )
    else:  # launch
        content = (
            b"%PDF-1.4\n"
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R /OpenAction << /Type /Action /S /Launch /F (cmd.exe) >> >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
            b"xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000130 00000 n \n0000000180 00000 n \n"
            b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n230\n%%EOF"
        )
    with open(malicious_dir / name, "wb") as f:
        f.write(content)

# Create 20 benign, 20 malicious (minimum for training)
for i in range(20):
    create_benign_pdf(f"benign_{i:03d}.pdf")
    create_malicious_pdf(f"malicious_js_{i:03d}.pdf", "js")
    if i < 10:
        create_malicious_pdf(f"malicious_launch_{i:03d}.pdf", "launch")

print(f"   Created {len(list(benign_dir.glob('*.pdf')))} benign samples")
print(f"   Created {len(list(malicious_dir.glob('*.pdf')))} malicious samples")

# Step 4: Run Training
print("[4/5] Starting LightGBM training...")
print("   This may take 2-5 minutes...")

import sys
sys.path.insert(0, str(Path("engine").resolve()))

# Import and run the training pipeline
os.chdir("engine")
exec(open("safedocs_lightgbm.py").read())

print("[5/5] Training complete! Model saved to engine/models/")
print("\n✅ Your engine is now AI-powered!")
