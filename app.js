// -------------------- DOM --------------------
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

// Optional password toggles (if you have them)
const encPwdToggle = document.getElementById("encPwdToggle");
const decPwdToggle = document.getElementById("decPwdToggle");

// -------------------- State --------------------
let loadedData = null; // plain payload or secure payload

// -------------------- Helpers --------------------
function setStatus(el, kind, msg) {
  if (!el) return;
  el.classList.remove("ok", "err");
  if (kind === "ok") el.classList.add("ok");
  if (kind === "err") el.classList.add("err");
  el.textContent = msg || "";
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Secure payload shape produced by your encryptMessage()
function isSecurePayload(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    obj.v === 1 &&
    typeof obj.iter === "number" &&
    typeof obj.salt === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.ct === "string"
  );
}

// Plain payload we define for "no password"
function isPlainPayload(obj) {
  return obj && typeof obj === "object" && obj.type === "plain" && typeof obj.text === "string";
}

// Toggle password visibility (if buttons exist)
if (encPwdToggle) {
  encPwdToggle.addEventListener("click", () => {
    encPwd.type = encPwd.type === "password" ? "text" : "password";
  });
}
if (decPwdToggle) {
  decPwdToggle.addEventListener("click", () => {
    decPwd.type = decPwd.type === "password" ? "text" : "password";
  });
}

// -------------------- Encrypt --------------------
btnEncrypt.addEventListener("click", async () => {
  try {
    setStatus(encStatus, "", "");
    const msg = (secretMsg.value || "").trim();
    const pwd = (encPwd.value || "").trim();

    if (!msg) return setStatus(encStatus, "err", "Message required.");

    // CASE A: No password => store plaintext directly
    if (!pwd) {
      const plainPayload = { type: "plain", text: msg };
      const text = JSON.stringify(plainPayload);

      payloadOut.textContent = JSON.stringify(plainPayload, null, 2);
      await drawQr(qrCanvas, text);

      return setStatus(encStatus, "ok", "Plain QR created (no password).");
    }

    // CASE B: Password provided => secure encrypt
    const pErr = validatePassword(pwd);
    if (pErr) return setStatus(encStatus, "err", pErr);

    const securePayload = await encryptMessage(msg, pwd);
    const text = JSON.stringify(securePayload);

    payloadOut.textContent = JSON.stringify(securePayload, null, 2);
    await drawQr(qrCanvas, text);

    return setStatus(encStatus, "ok", "Secure QR created (password required).");
  } catch (e) {
    console.error(e);
    setStatus(encStatus, "err", "Encryption/QR failed: " + (e?.message || String(e)));
  }
});

// -------------------- Auto-load QR when selecting image --------------------
if (qrFile) {
  qrFile.addEventListener("change", async () => {
    try {
      setStatus(decStatus, "", "");
      loadedData = null;
      decMsg.value = "";

      const file = qrFile.files && qrFile.files[0];
      if (!file) return;

      if (qrFileName) qrFileName.textContent = file.name;

      const qrText = await readQrFromImage(file, hiddenCanvas);
      const parsed = safeJsonParse(qrText);

      if (!parsed) return setStatus(decStatus, "err", "QR payload is not valid JSON.");

      loadedData = parsed;

      if (isSecurePayload(parsed)) {
        setStatus(decStatus, "ok", "Secure QR loaded. Enter password to decrypt.");
      } else if (isPlainPayload(parsed)) {
        setStatus(decStatus, "ok", "Plain QR loaded. No password needed.");
      } else {
        setStatus(decStatus, "ok", "QR loaded (unknown format).");
      }
    } catch (e) {
      console.error(e);
      setStatus(decStatus, "err", e?.message || String(e));
    }
  });
}

// -------------------- Decrypt --------------------
btnDecrypt.addEventListener("click", async () => {
  try {
    setStatus(decStatus, "", "");
    decMsg.value = "";

    if (!loadedData) return setStatus(decStatus, "err", "Please select a QR image first.");

    // CASE A: Plain QR => show plaintext
    if (isPlainPayload(loadedData)) {
      decMsg.value = loadedData.text;
      return setStatus(decStatus, "ok", "Decoded plaintext (no password).");
    }

    // CASE B: Secure QR => require password
    if (isSecurePayload(loadedData)) {
      const pwd = (decPwd.value || "").trim();
      if (!pwd) return setStatus(decStatus, "err", "Password required for this QR.");

      // Optional: enforce same password rules on decrypt too
      const pErr = validatePassword(pwd);
      if (pErr) return setStatus(decStatus, "err", pErr);

      try {
        const plain = await decryptMessage(loadedData, pwd);
        decMsg.value = plain;
        return setStatus(decStatus, "ok", "Decrypted successfully.");
      } catch {
        return setStatus(decStatus, "err", "Invalid password or corrupted QR payload.");
      }
    }

    return setStatus(decStatus, "err", "Unsupported QR payload format.");
  } catch (e) {
    console.error(e);
    setStatus(decStatus, "err", e?.message || String(e));
  }
});
