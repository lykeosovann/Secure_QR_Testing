/************************************************************
 * js/crypto.js — AES-256-GCM + PBKDF2-SHA256 (stable)
 *
 * Requires in js/base64.js:
 * - b64uEncode(str)                // string -> base64url string
 * - b64uDecode(token) -> Uint8Array // base64url -> bytes
 *
 * Payload format:
 * {
 *   v: 1,
 *   kdf: "PBKDF2-SHA256",
 *   iter: 200000,
 *   salt: "<b64url>",
 *   iv: "<b64url>",
 *   ct: "<b64url>"
 * }
 ************************************************************/

const CRYPTO_V = 1;
const PBKDF2_ITER_DEFAULT = 200000;
const SALT_LEN = 16; // 128-bit
const IV_LEN = 12;   // 96-bit (recommended for GCM)
const AES_KEY_BITS = 256;

/* ---------- helpers ---------- */

function bytesToB64u(bytes) {
  // Convert bytes -> binary string -> base64 -> base64url
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64uToBytes(token) {
  // Use your base64.js decoder if available
  if (typeof b64uDecode === "function") return b64uDecode(token);

  // Fallback decoder (base64url -> bytes)
  let s = String(token).replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveAesKeyFromPassword(password, saltBytes, iterations) {
  const pwdBytes = new TextEncoder().encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    pwdBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: Number(iterations),
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: AES_KEY_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

/* ---------- public API ---------- */

async function encryptMessage(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

  const key = await deriveAesKeyFromPassword(password, salt, PBKDF2_ITER_DEFAULT);

  const ptBytes = new TextEncoder().encode(plaintext);

  // AES-GCM output includes ciphertext + auth tag
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    ptBytes
  );

  const ctBytes = new Uint8Array(ctBuf);

  return {
    v: CRYPTO_V,
    kdf: "PBKDF2-SHA256",
    iter: PBKDF2_ITER_DEFAULT,
    salt: bytesToB64u(salt),
    iv: bytesToB64u(iv),
    ct: bytesToB64u(ctBytes),
  };
}

async function decryptMessage(payload, password) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }
  if (payload.v !== CRYPTO_V) {
    throw new Error("Unsupported payload version");
  }

  const iterations = Number(payload.iter);
  if (!Number.isFinite(iterations) || iterations < 10000) {
    throw new Error("Invalid iteration count");
  }

  const salt = b64uToBytes(payload.salt);
  const iv = b64uToBytes(payload.iv);
  const ct = b64uToBytes(payload.ct);

  const key = await deriveAesKeyFromPassword(password, salt, iterations);

  // decrypt will throw OperationError if password is wrong OR data corrupted
  const ptBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    ct
  );

  return new TextDecoder().decode(ptBuf);
}
