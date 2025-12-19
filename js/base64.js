/* js/base64.js
   Base64URL helpers for safe URL tokens.
   - b64uEncode(str) -> base64url string (no padding)
   - b64uDecodeToString(token) -> original string
   - b64uDecode(token) -> Uint8Array bytes (useful for crypto)
*/

function b64uEncode(str) {
  const bytes = new TextEncoder().encode(str);

  // bytes -> binary string -> base64
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }

  // base64 -> base64url
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64uDecodeToBytes(token) {
  // base64url -> base64
  let s = String(token).replace(/-/g, "+").replace(/_/g, "/");

  // pad base64 to multiple of 4
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);

  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function b64uDecodeToString(token) {
  const bytes = b64uDecodeToBytes(token);
  return new TextDecoder().decode(bytes);
}

// Backward compatibility helper (if your crypto.js expects b64uDecode)
function b64uDecode(token) {
  return b64uDecodeToBytes(token);
}
