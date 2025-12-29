import torch, torch.nn as nn

class MLPHead(nn.Module):
    def __init__(self, in_dim=384, hidden=128, p=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden), nn.ReLU(), nn.Dropout(p),
            nn.Linear(hidden, 1)
        )
    def forward(self, x):  # x: (B, 384)
        return self.net(x).squeeze(-1)
