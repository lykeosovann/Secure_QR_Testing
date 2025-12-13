import base64
import json
from dataclasses import asdict

from app.config import TOKEN_VERSION, SCRYPT_N, SCRYPT_R, SCRYPT_P
from app.crypto_aesgcm import AesGcmBlob, encrypt_bytes, decrypt_bytes


def b64u_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def b64u_decode(txt: str) -> bytes:
    pad = "=" * (-len(txt) % 4)
    return base64.urlsafe_b64decode(txt + pad)


def encrypt_payload_to_token(payload: dict, passphrase: str) -> str:
    # stable JSON
    plaintext = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

    blob = encrypt_bytes(plaintext, passphrase, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P)

    # token = v1.<salt>.<nonce>.<ciphertext>
    token = ".".join([
        TOKEN_VERSION,
        b64u_encode(blob.salt),
        b64u_encode(blob.nonce),
        b64u_encode(blob.ciphertext),
    ])
    return token


def decrypt_token_to_payload(token: str, passphrase: str) -> dict:
    parts = token.split(".")
    if len(parts) != 4:
        raise ValueError("Invalid token format")

    ver, salt_s, nonce_s, ct_s = parts
    if ver != TOKEN_VERSION:
        raise ValueError(f"Unsupported token version: {ver}")

    blob = AesGcmBlob(
        salt=b64u_decode(salt_s),
        nonce=b64u_decode(nonce_s),
        ciphertext=b64u_decode(ct_s),
    )

    plaintext = decrypt_bytes(blob, passphrase, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P)
    return json.loads(plaintext.decode("utf-8"))
