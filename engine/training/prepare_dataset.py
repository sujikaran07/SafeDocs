"""
SafeDocs CSV-to-JSON Dataset Converter
Prepares your CSV files for LightGBM training
"""
import pandas as pd
import json
from pathlib import Path

print("=" * 60)
print("SafeDocs Dataset Preparation")
print("=" * 60)

# Paths
csv_benign = Path("SafeDocs_Datasets_ML/safedocs_dataset/raw/office_pdf/benign.csv")
csv_malware = Path("SafeDocs_Datasets_ML/safedocs_dataset/raw/office_pdf/malware.csv")

json_benign_dir = Path("SafeDocs_Datasets_ML/safedocs_dataset/raw/json_features/benign")
json_malware_dir = Path("SafeDocs_Datasets_ML/safedocs_dataset/raw/json_features/malicious")

json_benign_dir.mkdir(parents=True, exist_ok=True)
json_malware_dir.mkdir(parents=True, exist_ok=True)

print("\n[1/3] Loading CSV files...")
df_benign = pd.read_csv(csv_benign)
df_malware = pd.read_csv(csv_malware)

print(f"   Benign samples: {len(df_benign)}")
print(f"   Malware samples: {len(df_malware)}")

# Take a balanced sample (to avoid overwhelming benign with malware)
sample_size = min(len(df_benign), 2000)  # Use 2000 from each for faster training
print(f"\n[2/3] Sampling {sample_size} from each class for balanced training...")

df_benign_sampled = df_benign.sample(n=min(sample_size, len(df_benign)), random_state=42)
df_malware_sampled = df_malware.sample(n=sample_size, random_state=42)

print(f"   Benign (sampled): {len(df_benign_sampled)}")
print(f"   Malware (sampled): {len(df_malware_sampled)}")

def convert_to_json(row, output_dir, label):
    """Convert a CSV row to JSON feature file"""
    # Create feature dict (skip non-numeric columns)
    features = {}
    for col in row.index:
        if col in ['type', 'hash']:
            continue
        try:
            val = float(row[col])
            features[col] = val
        except:
            pass
    
    # Use hash as filename (or generate one if missing)
    file_hash = str(row.get('hash', f"sample_{label}_{len(list(output_dir.glob('*.json')))}"))
    
    # Write JSON
    json_path = output_dir / f"{file_hash}.json"
    with open(json_path, 'w') as f:
        json.dump({"features": features}, f)

print("\n[3/3] Converting to JSON format...")
count = 0
for _, row in df_benign_sampled.iterrows():
    convert_to_json(row, json_benign_dir, "benign")
    count += 1
    if count % 100 == 0:
        print(f"   Processed {count} benign samples...")

count = 0
for _, row in df_malware_sampled.iterrows():
    convert_to_json(row, json_malware_dir, "malware")
    count += 1
    if count % 100 == 0:
        print(f"   Processed {count} malware samples...")

print(f"\n✅ Dataset ready!")
print(f"   Location: SafeDocs_Datasets_ML/safedocs_dataset/raw/json_features/")
print(f"   Benign: {len(list(json_benign_dir.glob('*.json')))} files")
print(f"   Malicious: {len(list(json_malware_dir.glob('*.json')))} files")
print("\n" + "=" * 60)
print("Ready for training! Run: py train_model_from_json.py")
print("=" * 60)
