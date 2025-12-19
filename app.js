/************************************************************
 * app.js
 * Flow:
 * 1) Encrypt -> payload JSON
 * 2) QR encodes URL: https://.../#t=<base64url(payload-json)>
 * 3) Phone scans -> opens page -> payload auto loaded
 * 4) User enters password -> decrypt -> plaintext
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

/* ---------- State ---------- */
let loadedPayload = null;

/* ---------- Helpers ---------- */
function togglePassword(input, btn) {
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "🙈" : "👁";
}

function buildBaseUrl() {
  // Works for GitHub Pages project sites: origin + pathname
  // ex: https://lykeosovann.github.io/Secure_QR_Testing/
  return `${location.origin}${location.pathname}`;
}

function tryLoadPayloadFromHash() {
  const hash = location.hash || "";
  // Accept "#t=..." or "#...&t=..."
  const m = hash.match(/(?:^|[#&])t=([^&]+)/);
  if (!m) return false;

  try {
    const token = m[1];
    const jsonText = b64uDecodeToString(token);
    loadedPayload = JSON.parse(jsonText);

    setStatus(decStatus, "ok", "QR payload loaded from link ✅ Enter password and click Decrypt.");
    return true;
  } catch (e) {
    console.error(e);
    loadedPayload = null;
    setStatus(decStatus, "err", "Invalid QR link payload.");
    return false;
  }
}

/* ---------- Password eye buttons ---------- */
if (encPwdToggle) encPwdToggle.addEventListener("click", () => togglePassword(encPwd, encPwdToggle));
if (decPwdToggle) decPwdToggle.addEventListener("click", () => togglePassword(decPwd, decPwdToggle));

/************************************************************
 * ENCRYPT -> generate QR URL
 ************************************************************/
btnEncrypt.addEventListener("click", async () => {
  try {
    setStatus(encStatus, "", "");
    const msg = secretMsg.value.trim();
    const pwd = encPwd.value;

    if (!msg) return setStatus(encStatus, "err", "Please enter a message.");

    const pErr = validatePassword(pwd);
    if (pErr) return setStatus(encStatus, "err", pErr);

    setStatus(encStatus, "", "Encrypting...");

    // payload is JSON with salt/iv/ct/iter etc.
    const payload = await encryptMessage(msg, pwd);
    const payloadJson = JSON.stringify(payload);

    // Build URL for phone scanning
    const baseUrl = buildBaseUrl();
    const token = b64uEncode(payloadJson);
    const url = `${baseUrl}#t=${token}`;

    // Show what will be inside QR (URL)
    payloadOut.textContent = url;

    // Draw QR containing the URL (phone will open it)
    await drawQr(qrCanvas, url);

    setStatus(encStatus, "ok", "QR link created ✅ Scan with phone to open this page.");
  } catch (e) {
    console.error(e);
    setStatus(encStatus, "err", "Encryption/QR failed.");
  }
});

/************************************************************
 * LOAD QR FROM IMAGE (PC flow)
 * User selects QR image -> decode -> JSON (or URL) -> payload
 ************************************************************/
qrFile.addEventListener("change", async () => {
  loadedPayload = null;
  decMsg.value = "";
  setStatus(decStatus, "", "");

  const file = qrFile.files && qrFile.files[0];
  if (qrFileName) qrFileName.textContent = file ? file.name : "No file selected";
  if (!file) return;

  try {
    setStatus(decStatus, "", "Reading QR image...");

    const qrText = await readQrFromImage(file, hiddenCanvas);
    const text = String(qrText).trim();

    // The QR might be:
    // A) URL with #t=... (phone flow)
    // B) Raw JSON payload (older flow)
    let payloadJson = null;

    // If it looks like a URL with #t= token
    const m = text.match(/#t=([^&]+)/);
    if (m) {
      payloadJson = b64uDecodeToString(m[1]);
    } else if (text.startsWith("{") && text.endsWith("}")) {
      payloadJson = text;
    } else {
      throw new Error("QR content is not a valid payload or link.");
    }

    loadedPayload = JSON.parse(payloadJson);
    setStatus(decStatus, "ok", "QR loaded ✅ Enter password and click Decrypt.");
  } catch (e) {
    console.error(e);
    loadedPayload = null;
    setStatus(decStatus, "err", e?.message || "Failed to read QR.");
  }
});

/************************************************************
 * DECRYPT
 ************************************************************/
btnDecrypt.addEventListener("click", async () => {
  // Always clear output first
  decMsg.value = "";
  setStatus(decStatus, "", "");

  if (!loadedPayload) {
    return setStatus(decStatus, "err", "Please select a QR image first (or open from QR link).");
  }

  const pwd = decPwd.value.trim();
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
      return setStatus(decStatus, "err", "Wrong password (or QR data was changed).");
    }
    setStatus(decStatus, "err", e?.message || "Decrypt failed.");
  }
});

/************************************************************
 * AUTO-LOAD payload when the page opens from a scanned URL
 ************************************************************/
tryLoadPayloadFromHash();
