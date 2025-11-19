#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Generate QR code image from text/URL or a file.
Usage examples:
  python generate_qr.py --text "http://localhost:8080/api/v1/user/chargepoints/EVBANGNA-CP001/1/websocket-url"
  python generate_qr.py --text '{"apiBaseUrl":"http://192.168.1.10:8080","chargePointIdentity":"EVBANGNA-CP001","connectorId":1}' -o ev-qr.png
  python generate_qr.py --text "https://example.com" --logo logo.png --logo-size 72
"""

import argparse
import json
import os
from typing import Optional
from PIL import Image
import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H


EC_MAP = {
    "L": ERROR_CORRECT_L,  # 7%
    "M": ERROR_CORRECT_M,  # 15%
    "Q": ERROR_CORRECT_Q,  # 25%
    "H": ERROR_CORRECT_H,  # 30%
}


def build_qr(
    data: str,
    ec_level: str = "M",
    box_size: int = 10,
    border: int = 4,
    version: Optional[int] = None,
) -> Image.Image:
    if ec_level not in EC_MAP:
        raise ValueError("ec-level must be one of L/M/Q/H")

    qr = qrcode.QRCode(
        version=version,                # None/auto or 1..40
        error_correction=EC_MAP[ec_level],
        box_size=box_size,              # pixel per module
        border=border,                  # modules around QR
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")
    return img


def paste_logo_center(img: Image.Image, logo_path: str, logo_size: int = 64) -> Image.Image:
    if not os.path.exists(logo_path):
        raise FileNotFoundError(f"Logo not found: {logo_path}")
    logo = Image.open(logo_path).convert("RGBA")
    # Resize keeping aspect ratio; shorter side = logo_size
    w, h = logo.size
    if w >= h:
        new_w = logo_size
        new_h = int(h * (logo_size / float(w)))
    else:
        new_h = logo_size
        new_w = int(w * (logo_size / float(h)))
    logo = logo.resize((new_w, new_h), Image.LANCZOS)

    # Optional: add white padding under logo to improve contrast
    pad = 6
    padded = Image.new("RGBA", (new_w + 2*pad, new_h + 2*pad), (255, 255, 255, 220))
    padded.paste(logo, (pad, pad), mask=logo)

    # Paste at center
    qr_w, qr_h = img.size
    x = (qr_w - padded.size[0]) // 2
    y = (qr_h - padded.size[1]) // 2
    img.alpha_composite(padded, (x, y))
    return img


def main():
    ap = argparse.ArgumentParser(description="Generate QR code image from text/URL.")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--text", help="Raw text/URL/JSON to encode")
    src.add_argument("--from-file", help="Read payload from a text file")

    ap.add_argument("-o", "--outfile", default="qr.png", help="Output image path (default: qr.png)")
    ap.add_argument("--ec-level", default="M", choices=["L", "M", "Q", "H"], help="Error correction level")
    ap.add_argument("--box-size", type=int, default=10, help="Pixels per QR module (default: 10)")
    ap.add_argument("--border", type=int, default=4, help="Border modules around QR (default: 4)")
    ap.add_argument("--version", type=int, default=None, help="QR version 1..40 (omit for auto-fit)")
    ap.add_argument("--logo", help="Optional path to a logo PNG/JPG to place at center")
    ap.add_argument("--logo-size", type=int, default=64, help="Logo target size in px (shorter side)")

    args = ap.parse_args()

    if args.from_file:
        with open(args.from_file, "r", encoding="utf-8") as f:
            payload = f.read().strip()
    else:
        payload = args.text.strip()

    # Hint: If you want to ensure it's valid JSON before encoding, uncomment:
    # try:
    #     json.loads(payload)
    # except Exception:
    #     pass  # It's fine if not JSON; QR can hold arbitrary text.

    img = build_qr(
        data=payload,
        ec_level=args.ec_level,
        box_size=args.box_size,
        border=args.border,
        version=args.version,
    )

    if args.logo:
        img = paste_logo_center(img, args.logo, args.logo_size)

    # Save as PNG (remove alpha for broader compatibility)
    if img.mode != "RGB":
        img = img.convert("RGB")
    img.save(args.outfile, format="PNG")
    print(f"✅ Saved: {args.outfile}")


if __name__ == "__main__":
    main()
