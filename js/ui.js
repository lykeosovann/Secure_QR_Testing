function setStatus(el, type, msg) {
  el.className = "status " + (type || "");
  el.textContent = msg || "";
}
