# Random Forest add-on for SafeDocs

1) Put `train_rf.py` next to your `features.csv` (the same one used for LightGBM).
2) Run:
   pip install scikit-learn joblib pandas numpy
   python train_rf.py
   # Artifacts will be saved under models_rf/

3) At inference time, load models from models_rf/ and combine with your LightGBM/DL scores.

Calibration automatically selects isotonic/sigmoid based on dataset size.
