from pathlib import Path
import qrcode

from app.config import OUTPUT_DIR


def ensure_output_dir() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def make_qr_png(data: str, filename_no_ext: str) -> Path:
    ensure_output_dir()
    img = qrcode.make(data)
    out = OUTPUT_DIR / f"{filename_no_ext}.png"
    img.save(out)
    return out
