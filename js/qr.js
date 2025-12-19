/************************************************************
 * js/qr.js (stable version)
 * Requires: libs/qrcode.min.js from the "qrcode" library
 * that supports: QRCode.toCanvas(...)
 * Requires: libs/jsQR.js for decoding images
 ************************************************************/

async function drawQr(canvas, text) {
  if (!canvas) throw new Error("qrCanvas not found");

  // Must be the "qrcode" library (QRCode.toCanvas exists)
  if (!window.QRCode || typeof window.QRCode.toCanvas !== "function") {
    throw new Error(
      "QR library mismatch. Need QRCode.toCanvas. Replace libs/qrcode.min.js with the 'qrcode' library build."
    );
  }

  const SIZE = 420;
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.style.width = SIZE + "px";
  canvas.style.height = SIZE + "px";
  canvas.style.display = "block";

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, SIZE, SIZE);

  await window.QRCode.toCanvas(canvas, text, {
    width: SIZE,
    margin: 2,
    errorCorrectionLevel: "H",
  });
}

function readQrFromImage(file, hiddenCanvas) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No image selected."));
    if (!hiddenCanvas) return reject(new Error("hiddenCanvas not found."));
    if (typeof window.jsQR !== "function") return reject(new Error("jsQR not loaded."));

    const img = new Image();
    img.onload = () => {
      const ctx = hiddenCanvas.getContext("2d", { willReadFrequently: true });

      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;

      const maxSides = [1600, 1200, 900, 700, 500];
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
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) return resolve(String(code.data).trim());
      }

      reject(new Error("QR not detected. Use clearer image or bigger QR."));
    };

    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = URL.createObjectURL(file);
  });
}
