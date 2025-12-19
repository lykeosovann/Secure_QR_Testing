async function drawQr(canvas, text) {
  if (!canvas) throw new Error("qrCanvas not found");
  if (!window.QRCode) throw new Error("QRCode library not loaded");

  // Clear canvas container
  const parent = canvas.parentElement;

  // Remove old QR if exists
  const old = parent.querySelector(".qr-img");
  if (old) old.remove();

  // Create a div container for QRCode.js
  const box = document.createElement("div");
  box.className = "qr-img";
  parent.insertBefore(box, canvas);

  // Hide the unused canvas (QRCode.js creates its own <canvas> or <img>)
  canvas.style.display = "none";

  // Generate QR
  new QRCode(box, {
    text,
    width: 240,
    height: 240,
    correctLevel: QRCode.CorrectLevel.M
  });
}
function readQrFromImage(file, hiddenCanvas) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No image selected."));

    const img = new Image();
    img.onload = () => {
      const ctx = hiddenCanvas.getContext("2d");

      // Downscale huge photos to improve decode reliability
      const maxSide = 1200;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (Math.max(w, h) > maxSide) {
        const scale = maxSide / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      hiddenCanvas.width = w;
      hiddenCanvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (!code || !code.data) return reject(new Error("QR not detected. Use a clearer image."));
      resolve(String(code.data).trim());
    };

    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = URL.createObjectURL(file);
  });
}
