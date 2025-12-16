// =====================
// Password rules
// =====================
const allowedSymbols = "!@#$%^&*()";

function setStatus(el, type, msg) {
  el.className = "status " + (type || "");
  el.textContent = msg || "";
}

function validatePassword(pwd) {
  if (!pwd || pwd.length < 12) return "Password must be at least 12 characters.";
  if (!/[a-z]/.test(pwd)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pwd)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(pwd)) return "Password must include a digit.";
  const symRegex = new RegExp("[" + allowedSymbols.replace(/[\^\-\]\\]/g, "\\$&") + "]");
  if (!symRegex.test(pwd)) return "Password must include a symbol from !@#$%^&*().";
  return null;
}

// =====================
// Base64URL helpers
// =====================
function b64uEncode(bytes) {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64uDecode(str) {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return new Uint8Array([...bin].map(c => c.charCodeAt(0)));
}

// =====================
// Crypto (AES-GCM)
// Key derived from password using PBKDF2
// =====================
async function deriveAesKeyFromPassword(password, salt, iterations) {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
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

async function encryptToPayload(message, password) {
  const enc = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 200000;

  const key = await deriveAesKeyFromPassword(password, salt, iterations);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(message)
  );

  const ciphertext = new Uint8Array(ciphertextBuf);

  // QR payload JSON
  return {
    v: 1,
    alg: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iter: iterations,
    salt: b64uEncode(salt),
    iv: b64uEncode(iv),
    ct: b64uEncode(ciphertext)
  };
}

async function decryptFromPayload(payload, password) {
  if (!payload || payload.v !== 1 || !payload.salt || !payload.iv || !payload.ct || !payload.iter) {
    throw new Error("Invalid QR payload format.");
  }

  const salt = b64uDecode(payload.salt);
  const iv = b64uDecode(payload.iv);
  const ct = b64uDecode(payload.ct);
  const iterations = payload.iter;

  const key = await deriveAesKeyFromPassword(password, salt, iterations);

  const plaintextBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct
  );

  return new TextDecoder().decode(plaintextBuf);
}

// =====================
// QR generate + decode
// =====================
async function drawQr(canvas, text) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await QRCode.toCanvas(canvas, text, { width: 220, margin: 1 });
}

function readQrFromImageFile(file, hiddenCanvas) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No image selected."));

    const img = new Image();
    img.onload = () => {
      hiddenCanvas.width = img.naturalWidth;
      hiddenCanvas.height = img.naturalHeight;

      const ctx = hiddenCanvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (!code) return reject(new Error("Could not detect a QR code in this image."));
      resolve(code.data);
    };
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = URL.createObjectURL(file);
  });
}

// =====================
// Wire up UI
// =====================
const secretMsgEl = document.getElementById("secretMsg");
const encPwdEl = document.getElementById("encPwd");
const btnEncrypt = document.getElementById("btnEncrypt");
const encStatus = document.getElementById("encStatus");
const payloadOut = document.getElementById("payloadOut");
const qrCanvas = document.getElementById("qrCanvas");

const qrFileEl = document.getElementById("qrFile");
const btnDecode = document.getElementById("btnDecode");
const decPwdEl = document.getElementById("decPwd");
const btnDecrypt = document.getElementById("btnDecrypt");
const decStatus = document.getElementById("decStatus");
const decMsgEl = document.getElementById("decMsg");
const hiddenCanvas = document.getElementById("hiddenCanvas");

let loadedQrText = null;      // raw text from QR
let loadedPayload = null;     // parsed JSON payload

btnEncrypt.addEventListener("click", async () => {
  setStatus(encStatus, "", "");
  setStatus(decStatus, "", "");
  decMsgEl.value = "";

  const msg = secretMsgEl.value.trim();
  const pwd = encPwdEl.value;

  if (!msg) return setStatus(encStatus, "err", "Please enter a secret message.");
  const perr = validatePassword(pwd);
  if (perr) return setStatus(encStatus, "err", perr);

  try {
    btnEncrypt.disabled = true;
    setStatus(encStatus, "", "Encrypting...");

    const payload = await encryptToPayload(msg, pwd);
    const text = JSON.stringify(payload);

    payloadOut.textContent = text;
    await drawQr(qrCanvas, text);

    setStatus(encStatus, "ok", "QR created ✅ (Save the QR image and share it.)");
  } catch (e) {
    setStatus(encStatus, "err", "Encryption failed: " + (e?.message || e));
  } finally {
    btnEncrypt.disabled = false;
  }
});

btnDecode.addEventListener("click", async () => {
  setStatus(decStatus, "", "");
  loadedQrText = null;
  loadedPayload = null;
  decMsgEl.value = "";

  const file = qrFileEl.files && qrFileEl.files[0];
  if (!file) return setStatus(decStatus, "err", "Please select a QR image file first.");

  try {
    btnDecode.disabled = true;
    setStatus(decStatus, "", "Reading QR...");

    loadedQrText = await readQrFromImageFile(file, hiddenCanvas);

    try {
      loadedPayload = JSON.parse(loadedQrText);
    } catch {
      loadedPayload = null;
    }

    if (!loadedPayload) {
      setStatus(decStatus, "err", "QR read, but content is not valid JSON payload.");
      return;
    }

    setStatus(decStatus, "ok", "QR loaded ✅ Now enter password and click Decrypt.");
  } catch (e) {
    setStatus(decStatus, "err", e?.message || String(e));
  } finally {
    btnDecode.disabled = false;
  }
});

btnDecrypt.addEventListener("click", async () => {
  setStatus(decStatus, "", "");
  decMsgEl.value = "";

  if (!loadedPayload) {
    return setStatus(decStatus, "err", "No QR payload loaded. Click 'Load QR' first.");
  }

  const pwd = decPwdEl.value;
  const perr = validatePassword(pwd);
  if (perr) return setStatus(decStatus, "err", perr);

  try {
    btnDecrypt.disabled = true;
    setStatus(decStatus, "", "Decrypting...");

    const plaintext = await decryptFromPayload(loadedPayload, pwd);
    decMsgEl.value = plaintext;

    setStatus(decStatus, "ok", "Decrypted ✅");
  } catch (e) {
    // Wrong password will usually throw here
    setStatus(decStatus, "err", "Decrypt failed (wrong password or corrupted QR).");
  } finally {
    btnDecrypt.disabled = false;
  }
});
