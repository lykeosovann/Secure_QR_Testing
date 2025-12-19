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
  loadedPayload = null;
  decMsg.value = "";
  setStatus(decStatus, "", "");

  const file = qrFile.files && qrFile.files[0];
  if (!file) return;

  try {
    setStatus(decStatus, "", "Reading QR image...");

    const qrText = await readQrFromImage(file, hiddenCanvas);

    // Important: trim and parse clean JSON
    loadedPayload = JSON.parse(qrText.trim());

    setStatus(
      decStatus,
      "ok",
      "QR loaded ✅ Enter password and click Decrypt."
    );
  } catch (e) {
    console.error(e);
    loadedPayload = null;
    setStatus(
      decStatus,
      "err",
      "Failed to read QR. Use a clear QR image."
    );
  }
});

/************************************************************
 * DECRYPT
 ************************************************************/

btnDecrypt.addEventListener("click", async () => {
  try {
    decMsg.value = "";
    setStatus(decStatus, "", "");

    if (!loadedPayload) {
      return setStatus(
        decStatus,
        "err",
        "Please select a QR image first."
      );
    }

    const pwd = decPwd.value;
    const pwdErr = validatePassword(pwd);
    if (pwdErr) {
      return setStatus(decStatus, "err", pwdErr);
    }

    setStatus(decStatus, "", "Decrypting...");

    const plaintext = await decryptMessage(loadedPayload, pwd);

    decMsg.value = plaintext;
    setStatus(decStatus, "ok", "Decrypted successfully ✅");
  } catch (e) {
    console.error(e);
    setStatus(
      decStatus,
      "err",
      "Wrong password or corrupted QR data."
    );
  }
});
