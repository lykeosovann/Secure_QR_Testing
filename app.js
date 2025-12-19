/************************************************************
 * app.js — FINAL (fixes payload loading + same password decrypt)
 *
 * Supports 3 flows:
 * A) Same device: Encrypt -> Decrypt immediately (no scan/upload)
 * B) Phone scan: QR opens GitHub Pages with ?t=...#t=... -> Decrypt
 * C) PC upload: Select QR image -> decode -> Decrypt
 ************************************************************/

/* ---------- Element refs ---------- */
const secretMsg = document.getElementById("secretMsg");
const encPwd = document.getElementById("encPwd");
const encPwdToggle = document.getElementById("encPwdToggle");
const btnEncrypt = document.getElementById("btnEncrypt");
const encStatus = document.getElementById("encStatus");
const qrCanvas = document.getElementById("qrCanvas");
const payloadOut = document.getElementById("payloadOut");

const qrFile = document.getElementById("qrFile");
const qrFileName = document.getElementById("qrFileName");
const decPwd = document.getElementById("decPwd");
const decPwdToggle = document.getElementById("decPwdToggle");
const btnDecrypt = document.getElementById("btnDecrypt");
const decMsg = document.getElementById("decMsg");
const decStatus = document.getElementById("decStatus");
const hiddenCanvas = document.getElementById("hiddenCanvas");

/* Optional debug element (if you added it in HTML) */
const qrLoadDebug = document.getElementById("qrLoadDebug");

/* ---------- State ---------- */
let loadedPayload = null;

/* ---------- Helpers ---------- */
function togglePassword(input, btn) {
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  if (btn) btn.textContent = show ? "🙈" : "👁";
}

function buildBaseUrl() {
  return `${location.origin}${location.pathname}`;
}

function setDecryptReadyUI(ready) {
  btnDecrypt.disabled = !ready;
  btnDecrypt.classList.toggle("disabled", !ready);
}

function showLoadDebug(type, msg) {
  if (!qrLoadDebug) return;
  qrLoadDebug.className = "status " + (type || "");
  qrLoadDebug.textContent = msg || "";
}

/**
 * Read token from either:
 * - Query: ?t=...
 * - Hash:  #t=...
 */
function getTokenFromUrl() {
  const qp = new URLSearchParams(location.search);
  let token = qp.get("t");

  if (!token) {
    const hash = location.hash || "";
    const m = hash.match(/(?:^|[#&])t=([^&]+)/);
    if (m) token = m[1];
  }
  return token;
}

/**
 * Load payload into loadedPayload from URL token.
 * Returns true if loaded, false if no token or invalid.
 */
function tryLoadPayloadFromUrl() {
  const token = getTokenFromUrl();
  if (!token) return false;

  try {
    const jsonText = b64uDecodeToString(token);
    loadedPayload = JSON.parse(jsonText);

    setStatus(decStatus, "ok", "QR payload loaded ✅ Enter password and click Decrypt.");
    setDecryptReadyUI(true);

    // Make it easy on phone
    if (decPwd) decPwd.focus();

    return true;
  } catch (e) {
    console.error(e);
    loadedPayload = null;
    setStatus(decStatus, "err", "Invalid QR payload in URL.");
    setDecryptReadyUI(false);
    return false;
  }
}

/* ---------- Password eye buttons ---------- */
if (encPwdToggle) encPwdToggle.addEventListener("click", () => togglePassword(encPwd, encPwdToggle));
if (decPwdToggle) decPwdToggle.addEventListener("click", () => togglePassword(decPwd, decPwdToggle));

/* Press Enter to decrypt (nice on mobile) */
if (decPwd) {
  decPwd.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnDecrypt.click();
  });
}

/* ---------- On page load: try auto-load from scan link ---------- */
tryLoadPayloadFromUrl();
setDecryptReadyUI(!!loadedPayload);

/************************************************************
 * ENCRYPT -> create payload -> create URL QR
 ************************************************************/
btnEncrypt.addEventListener("click", async () => {
  try {
    setStatus(encStatus, "", "");

    const msg = secretMsg.value.trim();
    const pwd = encPwd.value; // ✅ do NOT trim password

    if (!msg) return setStatus(encStatus, "err", "Please enter a message.");

    const pErr = validatePassword(pwd);
    if (pErr) return setStatus(encStatus, "err", pErr);

    setStatus(encStatus, "", "Encrypting...");

    const payload = await encryptMessage(msg, pwd);
    const payloadJson = JSON.stringify(payload);

    // ✅ IMPORTANT: allow decrypt immediately on same page
    loadedPayload = payload;
    setDecryptReadyUI(true);
    setStatus(decStatus, "ok", "Payload ready ✅ Enter password to decrypt (or scan QR on phone).");

    const baseUrl = buildBaseUrl();
    const token = b64uEncode(payloadJson);

    // ✅ token in BOTH query + hash (more reliable on phone/in-app browsers)
    const url = `${baseUrl}?t=${token}#t=${token}`;

    // Show the URL inside payload box (so you can copy/test)
    if (payloadOut) payloadOut.textContent = url;

    // QR contains URL so phone opens page
    await drawQr(qrCanvas, url);

    setStatus(encStatus, "ok", "QR link created ✅ Scan with phone to open this page.");
  } catch (e) {
    console.error(e);
    setStatus(encStatus, "err", "Encryption/QR failed: " + (e?.message || String(e)));
  }
});

/************************************************************
 * PC fallback: upload QR image -> decode -> load payload
 ************************************************************/
if (qrFile) {
  qrFile.addEventListener("change", async () => {
    loadedPayload = null;
    decMsg.value = "";
    setStatus(decStatus, "", "");
    showLoadDebug("", "");
    setDecryptReadyUI(false);

    const file = qrFile.files && qrFile.files[0];
    if (qrFileName) qrFileName.textContent = file ? file.name : "No file selected";
    if (!file) return;

    try {
      showLoadDebug("", "Reading QR image...");
      const qrText = await readQrFromImage(file, hiddenCanvas);
      const text = String(qrText).trim();

      // QR might contain:
      // - URL with ?t= or #t=
      // - raw JSON
      let payloadJson = null;

      // Try query param inside QR text (if it's a URL)
      try {
        const u = new URL(text);
        const t = new URLSearchParams(u.search).get("t");
        if (t) payloadJson = b64uDecodeToString(t);
      } catch (_) {}

      // Try hash token inside QR text
      if (!payloadJson) {
        const m = text.match(/(?:\?|&|#)t=([^&]+)/);
        if (m) payloadJson = b64uDecodeToString(m[1]);
      }

      // Fallback: raw JSON
      if (!payloadJson && text.startsWith("{") && text.endsWith("}")) {
        payloadJson = text;
      }

      if (!payloadJson) throw new Error("QR content is not a valid payload/link.");

      loadedPayload = JSON.parse(payloadJson);

      setStatus(decStatus, "ok", "QR loaded ✅ Enter password and click Decrypt.");
      showLoadDebug("ok", "QR loaded ✅");
      setDecryptReadyUI(true);
    } catch (e) {
      console.error(e);
      loadedPayload = null;
      setStatus(decStatus, "err", e?.message || "Failed to read QR.");
      showLoadDebug("err", "QR load failed: " + (e?.message || String(e)));
      setDecryptReadyUI(false);
    }
  });
}

/************************************************************
 * DECRYPT
 ************************************************************/
btnDecrypt.addEventListener("click", async () => {
  // Clear output first (avoid “garbage”)
  decMsg.value = "";
  setStatus(decStatus, "", "");

  // If payload not loaded yet, try to load from URL (phone scan case)
  if (!loadedPayload) {
    const ok = tryLoadPayloadFromUrl();
    if (!ok) {
      return setStatus(decStatus, "err", "No QR payload found. Scan QR again or upload QR image.");
    }
  }

  const pwd = decPwd.value; // ✅ do NOT trim password
  if (!pwd) {
    return setStatus(decStatus, "err", "Password is required.");
  }

  const pErr = validatePassword(pwd);
  if (pErr) {
    return setStatus(decStatus, "err", pErr);
  }

  try {
    setStatus(decStatus, "", "Decrypting...");
    const plaintext = await decryptMessage(loadedPayload, pwd);
    decMsg.value = plaintext;
    setStatus(decStatus, "ok", "Decrypted ✅");
  } catch (e) {
    console.error(e);
    if (e && e.name === "OperationError") {
      return setStatus(decStatus, "err", "Wrong password (or QR data changed).");
    }
    setStatus(decStatus, "err", e?.message || "Decrypt failed.");
  }
});
