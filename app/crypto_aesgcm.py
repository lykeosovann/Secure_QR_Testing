import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


@dataclass(frozen=True)
class AesGcmBlob:
    salt: bytes      # for key derivation
    nonce: bytes     # AESGCM nonce
    ciphertext: bytes


def derive_key_from_passphrase(passphrase: str, salt: bytes, *, n: int, r: int, p: int) -> bytes:
    if not passphrase:
        raise ValueError("Missing passphrase. Set environment variable QR_PASSPHRASE.")

    kdf = Scrypt(
        salt=salt,
        length=32,    # AES-256
        n=n,
        r=r,
        p=p,
    )
    return kdf.derive(passphrase.encode("utf-8"))


def encrypt_bytes(plaintext: bytes, passphrase: str, *, n: int, r: int, p: int) -> AesGcmBlob:
    salt = os.urandom(16)
    key = derive_key_from_passphrase(passphrase, salt, n=n, r=r, p=p)

    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # recommended nonce size for AESGCM
    ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data=None)

    return AesGcmBlob(salt=salt, nonce=nonce, ciphertext=ciphertext)


def decrypt_bytes(blob: AesGcmBlob, passphrase: str, *, n: int, r: int, p: int) -> bytes:
    key = derive_key_from_passphrase(passphrase, blob.salt, n=n, r=r, p=p)
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(blob.nonce, blob.ciphertext, associated_data=None)
