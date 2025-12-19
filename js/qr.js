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
