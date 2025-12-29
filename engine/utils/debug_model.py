"""
Debug script to check what's in the model file
"""
import joblib
from pathlib import Path

model_path = Path("models/lightgbm_calibrated.pkl")

print("=" * 70)
print("Checking Model File")
print("=" * 70)

try:
    loaded = joblib.load(model_path)
    print(f"\nType of loaded object: {type(loaded)}")
    print(f"\nObject: {loaded}")
    
    if isinstance(loaded, dict):
        print("\n✓ It's a dictionary!")
        print(f"Keys: {list(loaded.keys())}")
        
        for key, value in loaded.items():
            print(f"\n  {key}: {type(value)}")
            if hasattr(value, 'predict'):
                print(f"    ✓ Has predict method!")
    else:
        print(f"\nDirect model object")
        if hasattr(loaded, 'predict'):
            print("✓ Has predict method!")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
