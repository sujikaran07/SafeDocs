from sentence_transformers import SentenceTransformer
import numpy as np

class FrozenMiniLM:
    def __init__(self, name="sentence-transformers/all-MiniLM-L6-v2", device=None):
        self.model = SentenceTransformer(name, device=device)
        self.model.eval()

    def encode_text(self, text: str) -> np.ndarray:
        # mean-pooled, L2-normalized 384-d
        return self.model.encode([text], convert_to_numpy=True, normalize_embeddings=True, batch_size=64)[0]
