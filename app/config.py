import os
from pathlib import Path

# Where to save generated QR images
OUTPUT_DIR = Path("qr_codes")

# Only allow QR links to these domains (change to your own)
ALLOWED_DOMAINS = [
    "yourusername.github.io",
]

# Read secret from environment (DO NOT hardcode in code)
# Example:
#   export QR_PASSPHRASE="a-very-strong-passphrase"
QR_PASSPHRASE = os.getenv("QR_PASSPHRASE", "")

# Crypto settings
# Scrypt cost parameters (reasonable defaults for demo; can be tuned)
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1

# Token format versioning (helps future upgrades)
TOKEN_VERSION = "v1"
