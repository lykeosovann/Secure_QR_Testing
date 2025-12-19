const CRYPTO_V = 1;
const PBKDF2_ITER = 200000;
const SALT_LEN = 16;
const IV_LEN = 12;

async function deriveKey(password, saltBytes, iterations) {
  const pwdBytes = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey("raw", pwdBytes, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: Number(iterations), hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt, PBKDF2_ITER);

  const ptBytes = new TextEncoder().encode(plaintext);
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, ptBytes);
  const ct = new Uint8Array(ctBuf);

  return {
    v: CRYPTO_V,
    iter: PBKDF2_ITER,
    salt: b64uEncodeBytes(salt),
    iv: b64uEncodeBytes(iv),
    ct: b64uEncodeBytes(ct),
  };
}

async function decryptMessage(payload, password) {
  if (!payload || payload.v !== CRYPTO_V) throw new Error("Invalid payload");

  const salt = b64uDecodeToBytes(payload.salt);
  const iv = b64uDecodeToBytes(payload.iv);
  const ct = b64uDecodeToBytes(payload.ct);

  const key = await deriveKey(password, salt, payload.iter);
  const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, ct);
  return new TextDecoder().decode(ptBuf);
}
