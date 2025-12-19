/************************************************************
 * app.js  — Full working controller
 *
 * Goals:
 * 1) Encrypt -> create payload JSON -> create QR that is a URL:
 *      https://.../#t=<base64url(payload-json)>
 *    Phone scan opens your GitHub Pages page.
 *
 * 2) When page opens with #t=..., auto-load payload (no file upload needed).
 *    User just enters password and clicks Decrypt (or press Enter).
 *
 * 3) PC flow still supported: user can choose QR image file -> auto-load payload.
 *
 * Requirements (functions provided by your other files):
 * - validatePassword(pwd)  (js/password.js)
 * - encryptMessage(msg,pwd) / decryptMessage(payload,pwd) (js/crypto.js)
 * - drawQr(canvas,text) / readQrFromImage(file,hiddenCanvas) (js/qr.js)
 * - setStatus(el,type,msg) (js/ui.js)
 * - b64uEncode(str) / b64uDecodeToString(token) (js/base64.js)
 ************************************************************/

/* ---------- Element refs ---------- */
const secretMsg = document.getElementById("secretMsg");
const encPwd = document.getElementById("encPwd");
const encPwdToggle = document.getElementById("encPwdToggle");
const btnEncrypt = document.getElementById("btnEncrypt");
const encStatus = document.getElementById("encStatus");
const qrCanvas = document.getElementById("qrCanvas");
const payloadOut = document.getElementById("payloadOut"); // we will show the QR URL here

const qrFile = document.getElementById("qrFile");
const qrFileName = document.getElementById("qrFileName");
const decPwd = document.getElementById("decPwd");
const decPwdToggle = document.getElementById("decPwdToggle");
const btnDecrypt = document.getElementById("btnDecrypt");
const decMsg = document.getElementById("decMsg");
const decStatus = document.getElementById("decStatus");
const hiddenCanvas = document.getElementById("hiddenCanvas");

/* Optional debug line in HTML (if you added it) */
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
  // GitHub Pages project url base: origin + pathname
  // Example: https://lykeosovann.github.io/Secure_QR_Testing/
  return `${location.origin}${location.pathname}`;
}

function setDecryptReadyUI(ready) {
  if (!btnDecrypt) return;
  btnDecrypt.disabled = !ready;
  btnDecrypt.classList.toggle("disabled", !ready);
}

function showLoadDebug(type, msg) {
  if (!qrLoadDebug) return;
  qrLoadDebug.className = "status " + (type || "");
  qrLoadDebug.textContent = msg || "";
}

function clearDecryptOutput() {
  decMsg.value = "";
  setStatus(decStatus, "", "");
  showLoadDebug("", "");
}

/* ---------- Password eye buttons ---------- */
if (encPwdToggle) encPwdToggle.addEventListener("click", () => togglePassword(encPwd, encPwdToggle));
if (decPwdToggle) decPwdToggle.addEventListener("click", () => togglePassword(decPwd, decPwdToggle));

/* ---------- Enter key triggers decrypt ---------- */
if (decPwd) {
  decPwd.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnDecrypt.click();
  });
}

/************************************************************
 * AUTO-LOAD payload when page opens from scanned QR link
 * QR link format: https://.../#t=<token>
 ************************************************************/
function tryLoadPayloadFromHash() {
  const hash = location.hash || "";
  const m = hash.match(/(?:^|[#&])t=([^&]+)/);
  if (!m) return false;

  try {
    const token = m[1];
    const jsonText = b64uDecodeToString(token);
    loadedPayload = JSON.parse(jsonText);

    setStatus(decStatus, "ok", "QR payload loaded from link ✅ Enter password and click Decrypt.");
    setDecryptReadyUI(true);

    // Focus password to make it easy on mobile
    if (decPwd) decPwd.focus();
    return true;
  } catch (e) {
    console.error(e);
    loadedPayload = null;
    setStatus(decStatus, "err", "Invalid QR link payload.");
    setDecryptReadyUI(false);
    return false;
  }
}

// Run once on page load
tryLoadPayloadFromHash();
setDecryptReadyUI(!!loadedPayload);

/************************************************************
 * ENCRYPT -> generate payload JSON -> build URL -> QR
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

    const payload = await encryptMessage(msg, pwd);
    const payloadJson = JSON.stringify(payload);

    const baseUrl = buildBaseUrl();
    const token = b64uEncode(payloadJson);
    const url = `${baseUrl}#t=${token}`;

    // Show QR URL (so you can copy/test)
    if (payloadOut) payloadOut.textContent = url;

    // QR contains the URL so phone opens your page
    await drawQr(qrCanvas, url);

    setStatus(encStatus, "ok", "QR link created ✅ Scan with phone to open this page.");
  } catch (e) {
    console.error(e);
    setStatus(encStatus, "err", "Encryption/QR failed.");
  }
});

/************************************************************
 * PC flow: load QR image from file -> decode -> payload
 ************************************************************/
if (qrFile) {
  qrFile.addEventListener("change", async () => {
    loadedPayload = null;
    clearDecryptOutput();
    setDecryptReadyUI(false);

    const file = qrFile.files && qrFile.files[0];
    if (qrFileName) qrFileName.textContent = file ? file.name : "No file selected";
    if (!file) return;

    // Dependency checks (helpful if something is missing)
    if (typeof readQrFromImage !== "function") {
      showLoadDebug("err", "readQrFromImage() not found. Check js/qr.js load path/order.");
      return;
    }
    if (typeof window.jsQR !== "function") {
      showLoadDebug("err", "jsQR not loaded. Check ./libs/jsQR.js path/case.");
      return;
    }

    try {
      showLoadDebug("", "Reading QR image...");
      const qrText = await readQrFromImage(file, hiddenCanvas);
      const text = String(qrText).trim();

      // QR can be either:
      // A) URL with #t=token (phone flow)
      // B) Raw JSON payload (older flow)
      let payloadJson = null;

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
      showLoadDebug("ok", "QR loaded ✅");
      setDecryptReadyUI(true);
    } catch (e) {
      console.error(e);
      loadedPayload = null;
      setStatus(decStatus, "err", e?.message || "Failed to read QR.");
      showLoadDebug("err", "QR load failed: " + (e?.message || e));
      setDecryptReadyUI(false);
    }
  });
}

/************************************************************
 * DECRYPT
 * Must have payload + valid password.
 * Only writes plaintext on success.
 ************************************************************/
btnDecrypt.addEventListener("click", async () => {
  // Always clear output first
  decMsg.value = "";
  setStatus(decStatus, "", "");

  if (!loadedPayload) {
    const ok = tryLoadPayloadFromHash();
    if (!ok) {
      return setStatus(decStatus, "err", "No QR payload found. Scan the QR link again or select a QR image.");
    }
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
