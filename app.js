const secretMsg = document.getElementById("secretMsg");
const encPwd = document.getElementById("encPwd");
const encPwdToggle = document.getElementById("encPwdToggle");
const btnEncrypt = document.getElementById("btnEncrypt");
const btnDownloadQr = document.getElementById("btnDownloadQr");
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

let loadedPayloadObj = null;

function togglePassword(input, btn) {
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "🙈" : "👁";
}

encPwdToggle.addEventListener("click", () => togglePassword(encPwd, encPwdToggle));
decPwdToggle.addEventListener("click", () => togglePassword(decPwd, decPwdToggle));

btnDownloadQr.addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "secure_qr.png";
  a.href = qrCanvas.toDataURL("image/png");
  a.click();
});

btnEncrypt.addEventListener("click", async () => {
  try {
    setStatus(encStatus, "", "");
    const msg = secretMsg.value.trim();
    const pwd = encPwd.value; // do NOT trim password

    if (!msg) return setStatus(encStatus, "err", "Message required");
    const pErr = validatePassword(pwd);
    if (pErr) return setStatus(encStatus, "err", pErr);

    const payload = await encryptMessage(msg, pwd);
    const payloadJson = JSON.stringify(payload);

    // QR stores JSON directly (smaller and reliable)
    loadedPayloadObj = payload;
    payloadOut.textContent = payloadJson;

    await drawQr(qrCanvas, payloadJson);
    setStatus(encStatus, "ok", "QR created ✅ Download PNG and upload it to decrypt.");
  } catch (e) {
    console.error(e);
    setStatus(encStatus, "err", "Encrypt/QR failed: " + (e?.message || String(e)));
  }
});

qrFile.addEventListener("change", async () => {
  decMsg.value = "";
  setStatus(decStatus, "", "");
  loadedPayloadObj = null;

  const file = qrFile.files && qrFile.files[0];
  if (!file) return;

  try {
    setStatus(decStatus, "", "Reading QR...");
    const text = await readQrFromImage(file, hiddenCanvas);
    loadedPayloadObj = JSON.parse(text);
    setStatus(decStatus, "ok", "QR loaded ✅ Enter password and click Decrypt.");
  } catch (e) {
    console.error(e);
    setStatus(decStatus, "err", "QR load failed: " + (e?.message || String(e)));
  }
});

btnDecrypt.addEventListener("click", async () => {
  decMsg.value = "";
  setStatus(decStatus, "", "");

  if (!loadedPayloadObj) {
    return setStatus(decStatus, "err", "Upload QR image first (or encrypt first on this page).");
  }

  const pwd = decPwd.value; // do NOT trim password
  if (!pwd) return setStatus(decStatus, "err", "Password required");

  const pErr = validatePassword(pwd);
  if (pErr) return setStatus(decStatus, "err", pErr);

  try {
    const plain = await decryptMessage(loadedPayloadObj, pwd);
    decMsg.value = plain;
    setStatus(decStatus, "ok", "Decrypted ✅");
  } catch (e) {
    console.error(e);
    if (e && e.name === "OperationError") {
      return setStatus(decStatus, "err", "Wrong password (or QR data corrupted).");
    }
    setStatus(decStatus, "err", "Decrypt failed: " + (e?.message || String(e)));
  }
});
