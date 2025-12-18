async function drawQr(canvas, text) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await QRCode.toCanvas(canvas, text, { width: 240, margin: 1 });
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
