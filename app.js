const secretMsg = document.getElementById("secretMsg");
const encPwd = document.getElementById("encPwd");
const btnEncrypt = document.getElementById("btnEncrypt");
const encStatus = document.getElementById("encStatus");
const qrCanvas = document.getElementById("qrCanvas");
const payloadOut = document.getElementById("payloadOut");

const qrFile = document.getElementById("qrFile");
const qrFileName = document.getElementById("qrFileName");
const decPwd = document.getElementById("decPwd");
const btnDecrypt = document.getElementById("btnDecrypt");
const decMsg = document.getElementById("decMsg");
const decStatus = document.getElementById("decStatus");
const hiddenCanvas = document.getElementById("hiddenCanvas");

// password eye buttons
const encPwdToggle = document.getElementById("encPwdToggle");
const decPwdToggle = document.getElementById("decPwdToggle");

let loadedPayload = null;

/* ---------- Password show/hide ---------- */
function togglePassword(inputEl) {
  inputEl.type = (inputEl.type === "password") ? "text" : "password";
}
encPwdToggle?.addEventListener("click", () => togglePassword(encPwd));
decPwdToggle?.addEventListener("click", () => togglePassword(decPwd));

/* ---------- Encrypt ---------- */
btnEncrypt.addEventListener("click", async () => {
  try {
    const msg = secretMsg.value.trim();
    const pwd = encPwd.value;

    if (!msg) return setStatus(encStatus, "err", "Message required");

    const pErr = validatePassword(pwd);
    if (pErr) return setStatus(encStatus, "err", pErr);

    const payload = await encryptMessage(msg, pwd);
    const text = JSON.stringify(payload);

    payloadOut.textContent = text;
    await drawQr(qrCanvas, text);

    setStatus(encStatus, "ok", "QR created ✅");
  } catch (e) {
    console.error(e);
    setStatus(encStatus, "err", "Encrypt/QR failed: " + (e?.message || e));
  }
});

/* ---------- Auto-load QR when user selects an image ---------- */
qrFile.addEventListener("change", async () => {
  loadedPayload = null;
  decMsg.value = "";
  setStatus(decStatus, "", "");

  const file = qrFile.files && qrFile.files[0];
  qrFileName.textContent = file ? file.name : "No file selected";

  if (!file) return;

  try {
    setStatus(decStatus, "", "Reading QR...");
    const qrText = await readQrFromImage(file, hiddenCanvas);

    loadedPayload = JSON.parse(qrText);
    setStatus(decStatus, "ok", "QR loaded ✅ Now enter password and click Decrypt.");
  } catch (e) {
    console.error(e);
    loadedPayload = null;
    setStatus(decStatus, "err", "Failed to read QR image. Make sure the QR is clear.");
  }
});

/* ---------- Decrypt ---------- */
btnDecrypt.addEventListener("click", async () => {
  try {
    if (!loadedPayload) {
      return setStatus(decStatus, "err", "Please select a QR image first (it will auto-load).");
    }

    const pwd = decPwd.value;
    const pErr = validatePassword(pwd);
    if (pErr) return setStatus(decStatus, "err", pErr);

    setStatus(decStatus, "", "Decrypting...");
    const plain = await decryptMessage(loadedPayload, pwd);

    decMsg.value = plain;
    setStatus(decStatus, "ok", "Decrypted ✅");
  } catch (e) {
    console.error(e);
    setStatus(decStatus, "err", "Decrypt failed (wrong password or corrupted QR).");
  }
});
