/************************************************************
 * ELEMENT REFERENCES
 ************************************************************/

const secretMsg = document.getElementById("secretMsg");
const encPwd = document.getElementById("encPwd");
const encPwdToggle = document.getElementById("encPwdToggle");
const btnEncrypt = document.getElementById("btnEncrypt");
const encStatus = document.getElementById("encStatus");
const qrCanvas = document.getElementById("qrCanvas");
const payloadOut = document.getElementById("payloadOut");

const qrFile = document.getElementById("qrFile");
const decPwd = document.getElementById("decPwd");
const decPwdToggle = document.getElementById("decPwdToggle");
const btnDecrypt = document.getElementById("btnDecrypt");
const decMsg = document.getElementById("decMsg");
const decStatus = document.getElementById("decStatus");
const hiddenCanvas = document.getElementById("hiddenCanvas");

/************************************************************
 * STATE
 ************************************************************/

let loadedPayload = null;

/************************************************************
 * PASSWORD SHOW / HIDE
 ************************************************************/

function togglePassword(input, btn) {
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "🙈" : "👁";
}

encPwdToggle.addEventListener("click", () =>
  togglePassword(encPwd, encPwdToggle)
);

decPwdToggle.addEventListener("click", () =>
  togglePassword(decPwd, decPwdToggle)
);

/************************************************************
 * ENCRYPT + GENERATE QR
 ************************************************************/

btnEncrypt.addEventListener("click", async () => {
  try {
    setStatus(encStatus, "", "");

    const msg = secretMsg.value.trim();
    const pwd = encPwd.value;

    if (!msg) {
      return setStatus(encStatus, "err", "Please enter a message.");
    }

    const pwdErr = validatePassword(pwd);
    if (pwdErr) {
      return setStatus(encStatus, "err", pwdErr);
    }

    setStatus(encStatus, "", "Encrypting...");

    const payload = await encryptMessage(msg, pwd);
    const payloadText = JSON.stringify(payload);

    payloadOut.textContent = payloadText;
    await drawQr(qrCanvas, payloadText);

    setStatus(encStatus, "ok", "QR created successfully ✅");
  } catch (e) {
    console.error(e);
    setStatus(encStatus, "err", "Encryption failed.");
  }
});

/************************************************************
 * AUTO-LOAD QR IMAGE (ON FILE SELECT)
 ************************************************************/

qrFile.addEventListener("change", async () => {
  const dbg = document.getElementById("qrLoadDebug");

  loadedPayload = null;
  decMsg.value = "";
  setStatus(decStatus, "", "");
  if (dbg) { dbg.className = "status"; dbg.textContent = ""; }

  const file = qrFile.files && qrFile.files[0];

  // Show file name
  const nameEl = document.getElementById("qrFileName");
  if (nameEl) nameEl.textContent = file ? file.name : "No file selected";

  if (!file) {
    if (dbg) { dbg.className = "status err"; dbg.textContent = "No file found after selection."; }
    return;
  }

  // Check dependencies clearly
  if (typeof readQrFromImage !== "function") {
    if (dbg) { dbg.className = "status err"; dbg.textContent = "readQrFromImage() not found. Check js/qr.js function name and load order."; }
    return;
  }
  if (typeof window.jsQR !== "function") {
    if (dbg) { dbg.className = "status err"; dbg.textContent = "jsQR not loaded. Check ./Libs/jsQR.js path/case."; }
    return;
  }

  try {
    if (dbg) { dbg.className = "status"; dbg.textContent = "Reading QR image..."; }

    const qrText = await readQrFromImage(file, hiddenCanvas);

    if (dbg) { dbg.className = "status"; dbg.textContent = "QR decoded. Parsing JSON..."; }

    loadedPayload = JSON.parse(String(qrText).trim());

    if (dbg) { dbg.className = "status ok"; dbg.textContent = "QR loaded ✅ Now click Decrypt."; }
    setStatus(decStatus, "ok", "QR loaded ✅");
  } catch (e) {
    console.error(e);
    loadedPayload = null;
    const msg = e?.message || String(e);
    if (dbg) { dbg.className = "status err"; dbg.textContent = "QR load failed: " + msg; }
    setStatus(decStatus, "err", "QR load failed: " + msg);
  }
});



/************************************************************
 * DECRYPT
 ************************************************************/
btnDecrypt.addEventListener("click", async () => {
  // Always clear output first
  decMsg.value = "";
  setStatus(decStatus, "", "");

  // Must have QR loaded first
  if (!loadedPayload) {
    return setStatus(decStatus, "err", "Please select a QR image first.");
  }

  // Password required
  const pwd = decPwd.value.trim();
  if (!pwd) {
    return setStatus(decStatus, "err", "Password is required.");
  }

  // Password rules (invalid password should stop here)
  const pwdErr = validatePassword(pwd);
  if (pwdErr) {
    return setStatus(decStatus, "err", pwdErr);
  }

  try {
    setStatus(decStatus, "", "Decrypting...");

    // ONLY on success should we set decMsg.value
    const plaintext = await decryptMessage(loadedPayload, pwd);
    decMsg.value = plaintext;

    setStatus(decStatus, "ok", "Decrypted ✅");
  } catch (e) {
    console.error(e);

    // Wrong password / modified QR = OperationError commonly
    if (e && e.name === "OperationError") {
      return setStatus(decStatus, "err", "Wrong password (or QR data changed).");
    }
    setStatus(decStatus, "err", "Decrypt failed.");
  }
});
