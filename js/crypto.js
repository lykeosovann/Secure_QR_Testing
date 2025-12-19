async function deriveKey(password, salt, iterations) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(message, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 200000;

  const key = await deriveKey(password, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(message)
  );

  return {
    v: 1,
    iter: iterations,
    salt: b64uEncode(salt),
    iv: b64uEncode(iv),
    ct: b64uEncode(new Uint8Array(ciphertext))
  };
}

async function decryptMessage(payload, password) {
  // Validate payload fields
  if (!payload || payload.v !== 1) throw new Error("Invalid payload version.");
  if (!payload.salt || !payload.iv || !payload.ct || payload.iter == null)
    throw new Error("Missing fields in QR payload.");

  const iterations = Number(payload.iter);
  if (!Number.isFinite(iterations) || iterations < 10000)
    throw new Error("Invalid iteration count.");

  const salt = b64uDecode(String(payload.salt).trim());
  const iv   = b64uDecode(String(payload.iv).trim());
  const ct   = b64uDecode(String(payload.ct).trim());

  const key = await deriveKey(password, salt, iterations);

  // WebCrypto throws OperationError if wrong password / tampered data
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(plainBuf);
}
