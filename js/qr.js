async function drawQr(canvas, text) {
  // --- Case A: node-qrcode style (QRCode.toCanvas) ---
  if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
    const SIZE = 520;
    canvas.width = SIZE;
    canvas.height = SIZE;

    await window.QRCode.toCanvas(canvas, text, {
      width: SIZE,
      margin: 4,
      errorCorrectionLevel: "H",
    });
    return;
  }

  // --- Case B: qrcodejs style (new QRCode(element, options)) ---
  // qrcodejs doesn't draw into your existing <canvas>.
  // So we convert your canvas into a container div automatically.
  if (typeof window.QRCode === "function") {
    const parent = canvas.parentElement;
    if (!parent) throw new Error("QR container not found");

    // Create/Reuse a div container next to the canvas
    let box = parent.querySelector("#qrBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "qrBox";
      box.style.width = "520px";
      box.style.height = "520px";
      box.style.background = "#fff";
      box.style.padding = "8px";
      box.style.display = "inline-block";
      box.style.borderRadius = "8px";
      parent.insertBefore(box, canvas);
      canvas.style.display = "none"; // hide canvas since qrcodejs uses div/img
    }

    box.innerHTML = ""; // clear previous QR
    new window.QRCode(box, {
      text,
      width: 520,
      height: 520,
      correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 2,
    });
    return;
  }

  // --- No QR library loaded ---
  console.error("window.QRCode =", window.QRCode);
  throw new Error("QR generator library not loaded. Check ./libs/qrcode.min.js is correct.");
}

/* --------- QR decode from image (same as before) ---------- */
function readQrFromImage(file, hiddenCanvas) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No image selected"));
    if (!hiddenCanvas) return reject(new Error("hiddenCanvas missing"));
    if (typeof window.jsQR !== "function") return reject(new Error("jsQR not loaded"));

    const img = new Image();

    img.onload = () => {
      const ctx = hiddenCanvas.getContext("2d", { willReadFrequently: true });
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;

      const maxSides = [2000, 1600, 1200, 900, 700];
      for (const maxSide of maxSides) {
        let w = nw, h = nh;
        if (Math.max(w, h) > maxSide) {
          const s = maxSide / Math.max(w, h);
          w = Math.max(1, Math.round(w * s));
          h = Math.max(1, Math.round(h * s));
        }

        hiddenCanvas.width = w;
        hiddenCanvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (code && code.data) return resolve(String(code.data).trim());
      }

      reject(new Error("QR not detected. Download PNG (not screenshot) and try again."));
    };

    img.onerror = () => reject(new Error("Failed to load image file"));
    img.src = URL.createObjectURL(file);
  });
}
