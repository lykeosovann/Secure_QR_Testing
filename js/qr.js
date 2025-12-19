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

  const SIZE = 420;

  // Always size the canvas
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.style.width = SIZE + "px";
  canvas.style.height = SIZE + "px";
  canvas.style.display = "block";

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, SIZE, SIZE);

  // CASE A: "qrcode" library (has QRCode.toCanvas)
  if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
    await window.QRCode.toCanvas(canvas, text, {
      width: SIZE,
      margin: 2,
      errorCorrectionLevel: "H",
    });
    return;
  }

  // CASE B: "qrcodejs" library (new QRCode(...))
  // It renders into a DIV, not a canvas, so we convert its <img>/<canvas> to your canvas.
  if (window.QRCode && typeof window.QRCode === "function") {
    // Create a temporary container
    const tmp = document.createElement("div");
    tmp.style.position = "fixed";
    tmp.style.left = "-99999px";
    tmp.style.top = "-99999px";
    document.body.appendChild(tmp);

    // Render QR in the temp container
    tmp.innerHTML = "";
    new window.QRCode(tmp, {
      text,
      width: SIZE,
      height: SIZE,
      correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 3,
    });

    // qrcodejs may create an <img> or <canvas>
    const img = tmp.querySelector("img");
    const c2 = tmp.querySelector("canvas");

    if (img) {
      await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => {
          ctx.clearRect(0, 0, SIZE, SIZE);
          ctx.drawImage(im, 0, 0, SIZE, SIZE);
          res();
        };
        im.onerror = rej;
        im.src = img.src;
      });
      document.body.removeChild(tmp);
      return;
    }

    if (c2) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(c2, 0, 0, SIZE, SIZE);
      document.body.removeChild(tmp);
      return;
    }

    document.body.removeChild(tmp);
    throw new Error("qrcodejs rendered nothing.");
  }

  throw new Error("QR library not loaded (qrcode or qrcodejs). Check libs/qrcode.min.js");
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
