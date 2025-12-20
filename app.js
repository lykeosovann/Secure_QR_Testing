// -------------------- DOM --------------------
const secretMsg = document.getElementById("secretMsg");
const encPwd = document.getElementById("encPwd");
const encMode = document.getElementById("encMode");
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

// Password toggle buttons (if you have them)
const encPwdToggle = document.getElementById("encPwdToggle");
const decPwdToggle = document.getElementById("decPwdToggle");

// -------------------- State --------------------
let loadedData = null; // can be {type:"plain",text:"..."} or secure payload object

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

// Detect payload type
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

function isPlainPayload(obj) {
  return obj && typeof obj === "object" && obj.type === "plain" && typeof obj.text === "string";
}

// -------------------- UI behaviors --------------------
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

// Enable/disable password input depending on mode
function syncEncryptModeUI() {
  const mode = encMode ? encMode.value : "secure";
  if (mode === "plain") {
    encPwd.value = "";
    encPwd.disabled = true;
    if (encPwdToggle) encPwdToggle.disabled = true;
  } else {
    encPwd.disabled = false;
    if (encPwdToggle) encPwdToggle.disabled = false;
  }
}
if (encMode) {
  encMode.addEventListener("change", syncEncryptModeUI);
  syncEncryptModeUI();
}

// -------------------- Encrypt --------------------
btnEncrypt.addEventListener("click", async () => {
  try {
    setStatus(encStatus, "", "");
    const msg = (secretMsg.value || "").trim();
    if (!msg) return setStatus(encStatus, "err", "Message required.");

    const mode = encMode ? encMode.value : "secure";

    // ---- Plain mode: store plaintext directly in QR ----
    if (mode === "plain") {
      const plainPayload = { type: "plain", text: msg };

      payloadOut.textContent = JSON.stringify(plainPayload, null, 2);
      await drawQr(qrCanvas, JSON.stringify(plainPayload));

      setStatus(encStatus, "ok", "Plain QR created (no password).");
      return;
    }

    // ---- Secure mode: AES encrypt with password ----
    const pwd = encPwd.value || "";
    const pErr = validatePassword(pwd);
    if (pErr) return setStatus(encStatus, "err", pErr);

    const securePayload = await encryptMessage(msg, pwd);

    payloadOut.textContent = JSON.stringify(securePayload, null, 2);
    await drawQr(qrCanvas, JSON.stringify(securePayload));

    setStatus(encStatus, "ok", "Secure QR created (password required).");
  } catch (e) {
    console.error(e);
    setStatus(encStatus, "err", "Encryption/QR failed: " + (e?.message || String(e)));
  }
});

// -------------------- Auto-load QR when user selects image --------------------
if (qrFile) {
  qrFile.addEventListener("change", async () => {
    try {
      setStatus(decStatus, "", "");
      loadedData = null;

      const file = qrFile.files && qrFile.files[0];
      if (!file) return;

      if (qrFileName) qrFileName.textContent = file.name;

      const qrText = await readQrFromImage(file, hiddenCanvas);

      const parsed = safeJsonParse(qrText);
      if (!parsed) {
        return setStatus(decStatus, "err", "QR does not contain valid JSON payload.");
      }

      // Save payload
      loadedData = parsed;

      // Helpful message
      if (isSecurePayload(parsed)) {
        setStatus(decStatus, "ok", "Secure QR loaded. Password required to decrypt.");
      } else if (isPlainPayload(parsed)) {
        setStatus(decStatus, "ok", "Plain QR loaded. No password needed.");
      } else {
        setStatus(decStatus, "ok", "QR loaded. Unknown format, will try best.");
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

    // ---- If plain QR ----
    if (isPlainPayload(loadedData)) {
      decMsg.value = loadedData.text;
      return setStatus(decStatus, "ok", "Decoded plaintext (no password).");
    }

    // ---- If secure QR ----
    if (isSecurePayload(loadedData)) {
      const pwd = (decPwd.value || "").trim();
      if (!pwd) return setStatus(decStatus, "err", "Password required for this QR.");

      // optional: enforce same rules on decrypt too
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

    // ---- Fallback (unknown payload) ----
    // If QR holds raw text, show it directly:
    if (typeof loadedData === "string") {
      decMsg.value = loadedData;
      return setStatus(decStatus, "ok", "Decoded text.");
    }

    return setStatus(decStatus, "err", "Unsupported QR payload format.");
  } catch (e) {
    console.error(e);
    setStatus(decStatus, "err", e?.message || String(e));
  }
});
