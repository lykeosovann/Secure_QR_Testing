async function drawQr(canvas, text) {
  const errEl = document.getElementById("qrError");
  const showErr = (m) => {
    if (errEl) { errEl.className = "status err"; errEl.textContent = m; }
  };

  if (!canvas) {
    showErr("QR canvas not found (id=qrCanvas).");
    return;
  }

  // Check library
  if (!window.QRCode || !window.QRCode.toCanvas) {
    showErr("QRCode library NOT loaded. Check libs/qrcode.min.js path and script order.");
    return;
  }

  try {
    // Force size
    canvas.width = 240;
    canvas.height = 240;

    // Clear
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw QR
    await window.QRCode.toCanvas(canvas, text, { width: 240, margin: 1 });

    // Force visible
    canvas.style.width = "240px";
    canvas.style.height = "240px";
    canvas.style.display = "block";

    if (errEl) { errEl.className = "status ok"; errEl.textContent = "QR rendered ✅"; }
  } catch (e) {
    showErr("QR draw error: " + (e?.message || e));
    console.error(e);
  }
}
