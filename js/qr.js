async function drawQr(canvas, text) {
  if (!canvas) throw new Error("qrCanvas not found");
  if (!window.QRCode) throw new Error("QRCode library not loaded");

  // Make sure canvas has real drawing size
  canvas.width = 240;
  canvas.height = 240;

  // Draw QR
  await window.QRCode.toCanvas(canvas, text, { width: 240, margin: 1 });

  // Safety: force visible size (CSS can hide it)
  canvas.style.width = "240px";
  canvas.style.height = "240px";
  canvas.style.display = "block";
}


function readQrFromImage(file, hiddenCanvas) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      hiddenCanvas.width = img.naturalWidth;
      hiddenCanvas.height = img.naturalHeight;

      const ctx = hiddenCanvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (!code) return reject("QR not detected");
      resolve(code.data);
    };
    img.src = URL.createObjectURL(file);
  });
}
