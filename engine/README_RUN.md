# SafeDocs LightGBM Pipeline (Quick Start)

## Folder expectations
```
SafeDocs_Datasets_ML/
└── safedocs_dataset/
    ├── raw/
    │   ├── json_features/
    │   │   ├── benign/      # JSON dicts with features (optional)
    │   │   └── malicious/
    │   └── office_pdf/
    │       ├── benign/      # .pdf .docx .xlsx .pptx .rtf .xls
    │       └── malicious/
    ├── working/             # will be created (train/val/test splits)
    └── metadata/            # manifest, features, splits, metrics
```

## Install (Windows, VS Code terminal)
```powershell
py -3 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run (full pipeline)
```powershell
python safedocs_lightgbm.py --data-root "C:/path/to/SafeDocs_Datasets_ML"
```

## Predict a single file
```powershell
python safedocs_lightgbm.py --data-root "C:/path/to/SafeDocs_Datasets_ML" --predict "C:/path/to/file.pdf"
```

Artifacts:
- `safedocs_dataset/working/` — copies of files split into train/val/test
- `safedocs_dataset/metadata/manifest.csv` — list of every file
- `safedocs_dataset/metadata/features.csv` — extracted feature table
- `safedocs_dataset/metadata/metrics.json` — train/val/test metrics
- `safedocs_dataset/models/lightgbm_calibrated.pkl` — serialized model+calibrator
- `safedocs_dataset/models/feature_cols.json` — feature order for inference
