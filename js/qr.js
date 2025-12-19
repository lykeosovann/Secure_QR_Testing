/************************************************************
 * js/qr.js
 *
 * Functions:
 * - drawQr(canvas, text)
 *    Draws QR into a canvas using QRCode.toCanvas (qrcode lib).
 *    Uses high error correction + larger size for phone reliability.
 *
 * - readQrFromImage(file, hiddenCanvas)
 *    Reads QR from an image file (png/jpg) using jsQR.
 *    Downscales big images and retries a few scales for better success.
 ************************************************************/

async function drawQr(canvas, text) {
  if (!canvas) throw new Error("qrCanvas not found");
  if (!window.QRCode || typeof window.QRCode.toCanvas !== "function") {
    throw new Error("QRCode.toCanvas not available. Check libs/qrcode.min.js");
  }

  // Big QR + strong ECC for phone reliability
  const SIZE = 420;

  // Force canvas real size
  canvas.width = SIZE;
  canvas.height = SIZE;

  // Clear
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Draw QR
  await window.QRCode.toCanvas(canvas, text, {
    width: SIZE,
    margin: 2,
    errorCorrectionLevel: "H",
  });

  // Force visible size (CSS sometimes hides/shrinks canvas)
  canvas.style.width = SIZE + "px";
  canvas.style.height = SIZE + "px";
  canvas.style.display = "block";
}

/**
 * Try to decode QR using jsQR at multiple scales.
 * This improves success when images are too large or blurred.
 */
function readQrFromImage(file, hiddenCanvas) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No image selected."));
    if (!hiddenCanvas) return reject(new Error("hiddenCanvas not found."));
    if (typeof window.jsQR !== "function") return reject(new Error("jsQR library not loaded."));

    const img = new Image();

    img.onload = () => {
      const ctx = hiddenCanvas.getContext("2d", { willReadFrequently: true });

      // Natural size
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;

      if (!nw || !nh) return reject(new Error("Invalid image size."));

      // Try several max sizes (downscale) to improve decoding
      const maxSides = [1600, 1200, 900, 700, 500];

      for (const maxSide of maxSides) {
        let w = nw;
        let h = nh;

        if (Math.max(w, h) > maxSide) {
          const scale = maxSide / Math.max(w, h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
        }

        hiddenCanvas.width = w;
        hiddenCanvas.height = h;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          resolve(String(code.data).trim());
          return;
        }
      }

      reject(new Error("QR not detected. Use a clearer/bigger QR image."));
    };

    img.onerror = () => reject(new Error("Failed to load image."));

    // Load file
    img.src = URL.createObjectURL(file);
  });
}
