"""
SafeDocs Training Script (using JSON features from CSVs)
"""
import subprocess
import sys

print("\n" + "=" * 70)
print(" " * 20 + "SafeDocs Model Training")
print("=" * 70)

# Step 1: Convert CSVs to JSON
print("\n📦 STEP 1: Preparing Dataset...")
print("-" * 70)
result = subprocess.run([sys.executable, "prepare_dataset.py"], capture_output=False)
if result.returncode != 0:
    print("❌ Dataset preparation failed!")
    sys.exit(1)

# Step 2: Train the model
print("\n\n🧠 STEP 2: Training LightGBM Model...")
print("-" * 70)
print("This will take 5-10 minutes. Please be patient...\n")

result = subprocess.run([
    sys.executable, 
    "engine/safedocs_lightgbm.py",
    "--data-root", "SafeDocs_Datasets_ML"
], capture_output=False)

if result.returncode != 0:
    print("❌ Training failed!")
    sys.exit(1)

print("\n" + "=" * 70)
print("✅ TRAINING COMPLETE!")
print("=" * 70)
print("\nYour model is now saved in: engine/models/lightgbm_calibrated.pkl")
print("\n🚀 The engine will automatically use this trained model.")
print("   Restart the engine to activate: npm run engine:dev")
print("=" * 70 + "\n")
