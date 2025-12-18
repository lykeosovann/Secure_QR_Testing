const secretMsg = document.getElementById("secretMsg");
const encPwd = document.getElementById("encPwd");
const btnEncrypt = document.getElementById("btnEncrypt");
const encStatus = document.getElementById("encStatus");
const qrCanvas = document.getElementById("qrCanvas");
const payloadOut = document.getElementById("payloadOut");

const qrFile = document.getElementById("qrFile");
const btnDecode = document.getElementById("btnDecode");
const decPwd = document.getElementById("decPwd");
const btnDecrypt = document.getElementById("btnDecrypt");
const decMsg = document.getElementById("decMsg");
const decStatus = document.getElementById("decStatus");
const hiddenCanvas = document.getElementById("hiddenCanvas");

let loadedPayload = null;

/* Encrypt */
btnEncrypt.addEventListener("click", async () => {
  const msg = secretMsg.value.trim();
  const pwd = encPwd.value;

  if (!msg) return setStatus(encStatus, "err", "Message required");

  const pErr = validatePassword(pwd);
  if (pErr) return setStatus(encStatus, "err", pErr);

  const payload = await encryptMessage(msg, pwd);
  payloadOut.textContent = JSON.stringify(payload);
  await drawQr(qrCanvas, JSON.stringify(payload));

  setStatus(encStatus, "ok", "QR created");
});

/* Load QR */
btnDecode.addEventListener("click", async () => {
  const file = qrFile.files[0];
  if (!file) return setStatus(decStatus, "err", "Select QR image");

  const qrText = await readQrFromImage(file, hiddenCanvas);
  loadedPayload = JSON.parse(qrText);
  setStatus(decStatus, "ok", "QR loaded");
});

/* Decrypt */
btnDecrypt.addEventListener("click", async () => {
  if (!loadedPayload) return setStatus(decStatus, "err", "Load QR first");

  const pwd = decPwd.value;
  const pErr = validatePassword(pwd);
  if (pErr) return setStatus(decStatus, "err", pErr);

  const plain = await decryptMessage(loadedPayload, pwd);
  decMsg.value = plain;
  setStatus(decStatus, "ok", "Decrypted");
});
