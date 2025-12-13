import argparse
from datetime import datetime, timezone

from app.config import ALLOWED_DOMAINS, QR_PASSPHRASE
from app.validators import is_https_url, is_allowed_domain
from app.url_builder import build_qr_url
from app.qr_generator import make_qr_png


def parse_args():
    ap = argparse.ArgumentParser(description="Secure QR (AES-GCM) generator")
    ap.add_argument("--page-url", required=True, help="Your GitHub Pages URL (HTTPS) that hosts web/index.html")
    ap.add_argument("--name", default="secure_qr", help="Output PNG file name (without extension)")
    ap.add_argument("--subject", default="demo", help="What this QR is for (string)")
    return ap.parse_args()


def main():
    args = parse_args()

    if not is_https_url(args.page_url):
        raise SystemExit("Error: --page-url must be a valid HTTPS URL")

    if not is_allowed_domain(args.page_url, ALLOWED_DOMAINS):
        raise SystemExit("Error: page domain not allowed. Update ALLOWED_DOMAINS in app/config.py")

    if not QR_PASSPHRASE:
        raise SystemExit('Error: Missing secret. Set env var QR_PASSPHRASE="strong-passphrase"')

    # Payload can be anything (keep it small for QR readability)
    payload = {
        "sub": args.subject,
        "iat": datetime.now(timezone.utc).isoformat(),
        # You can add: user_id, session_id, one-time nonce, expiry, etc.
    }

    final_url = build_qr_url(args.page_url, payload, QR_PASSPHRASE)
    out = make_qr_png(final_url, args.name)

    print("QR URL:", final_url)
    print("Saved:", out)


if __name__ == "__main__":
    main()
