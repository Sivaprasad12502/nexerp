#!/usr/bin/env python3
"""Generate static PNG thumbnails for document template picker."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "templates"
W, H = 320, 440
THEME = "#7438dc"
BG = "#ffffff"
MUTED = "#71717a"
BORDER = "#e4e4e7"
DARK = "#18181b"


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_common_body(draw: ImageDraw.ImageDraw, y_start: int) -> None:
    """Shared invoice body: from/to boxes, table, totals."""
    pad = 16
    box_h = 52
    gap = 8
    box_w = (W - pad * 2 - gap) // 2

    # From / To boxes
    for i, title in enumerate(["Billed by", "Billed to"]):
        x = pad + i * (box_w + gap)
        draw.rounded_rectangle([x, y_start, x + box_w, y_start + box_h], radius=4, outline=BORDER, width=1)
        draw.text((x + 6, y_start + 4), title, fill=hex_rgb(THEME), font=load_font(7, True))
        draw.text((x + 6, y_start + 16), "Studio Den Pvt Ltd" if i == 0 else "Acme Corp", fill=hex_rgb(DARK), font=load_font(7, True))
        draw.text((x + 6, y_start + 28), "Mumbai, Maharashtra", fill=hex_rgb(MUTED), font=load_font(6))

    table_y = y_start + box_h + 10
    table_h = 88
    draw.rectangle([pad, table_y, W - pad, table_y + table_h], fill=hex_rgb(DARK))
    headers = ["Item", "Qty", "Rate", "Amount"]
    col_x = [pad + 4, W - pad - 90, W - pad - 58, W - pad - 28]
    for hx, h in zip(col_x, headers):
        draw.text((hx, table_y + 5), h, fill="#ffffff", font=load_font(6, True))

    rows = [
        ("Web Design", "1", "25,000", "25,000"),
        ("Hosting", "12", "500", "6,000"),
    ]
    for ri, row in enumerate(rows):
        ry = table_y + 18 + ri * 16
        bg = "#f9fafb" if ri % 2 else "#ffffff"
        draw.rectangle([pad, ry, W - pad, ry + 16], fill=bg)
        for cx, val in zip(col_x, row):
            draw.text((cx, ry + 3), val, fill=hex_rgb(DARK), font=load_font(6))

    totals_y = table_y + table_h + 8
    draw.text((W - pad - 70, totals_y), "Sub Total", fill=hex_rgb(MUTED), font=load_font(6))
    draw.text((W - pad - 28, totals_y), "31,000", fill=hex_rgb(DARK), font=load_font(6))
    draw.text((W - pad - 70, totals_y + 12), "Total (INR)", fill=hex_rgb(DARK), font=load_font(7, True))
    draw.text((W - pad - 28, totals_y + 12), "36,580", fill=hex_rgb(DARK), font=load_font(7, True))

    footer_y = H - 36
    draw.line([pad, footer_y, W - pad, footer_y], fill=hex_rgb(BORDER), width=1)
    draw.text((pad, footer_y + 6), "Bank: HDFC · UPI QR", fill=hex_rgb(MUTED), font=load_font(6))
    draw.rectangle([W - pad - 28, footer_y + 4, W - pad - 4, footer_y + 28], outline=hex_rgb(BORDER), width=1)


def professional() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([12, 12, W - 12, 72], radius=6, fill=hex_rgb(THEME))
    draw.text((22, 20), "Invoice", fill="#ffffff", font=load_font(14, True))
    draw.text((22, 40), "No. INV-001  ·  Date 15 Jun 2026", fill="#e9d5ff", font=load_font(7))
    draw.rounded_rectangle([W - 58, 22, W - 22, 58], radius=4, fill=(255, 255, 255, 40))
    draw.text((W - 52, 36), "LOGO", fill="#ffffff", font=load_font(6))
    draw_common_body(draw, 82)
    return img


def modern() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.text((16, 16), "LOGO", fill=hex_rgb(MUTED), font=load_font(8, True))
    draw.text((16, 32), "Invoice", fill=hex_rgb(THEME), font=load_font(13, True))
    draw.text((W - 16, 20), "Invoice No: INV-001", fill=hex_rgb(DARK), font=load_font(7), anchor="ra")
    draw.text((W - 16, 34), "Date: 15 Jun 2026", fill=hex_rgb(MUTED), font=load_font(6), anchor="ra")
    draw.line([16, 58, W - 16, 58], fill=hex_rgb(THEME), width=2)
    draw_common_body(draw, 68)
    return img


def simple() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.text((16, 16), "Invoice", fill=hex_rgb(DARK), font=load_font(14, True))
    draw.text((16, 36), "Professional services", fill=hex_rgb(MUTED), font=load_font(7))
    draw.text((W - 16, 18), "#INV-001", fill=hex_rgb(MUTED), font=load_font(7), anchor="ra")
    draw.text((W - 16, 32), "15 Jun 2026", fill=hex_rgb(MUTED), font=load_font(6), anchor="ra")
    draw_common_body(draw, 58)
    return img


def classic() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.text((W // 2, 18), "LOGO", fill=hex_rgb(MUTED), font=load_font(7, True), anchor="ma")
    draw.text((W // 2, 34), "INVOICE", fill=hex_rgb(THEME), font=load_font(13, True), anchor="ma")
    draw.text((W // 2, 52), "No. INV-001  ·  15 Jun 2026", fill=hex_rgb(MUTED), font=load_font(6), anchor="ma")
    draw.line([16, 62, W - 16, 62], fill=hex_rgb(BORDER), width=1)
    draw_common_body(draw, 72)
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    generators = {
        "professional": professional,
        "modern": modern,
        "simple": simple,
        "classic": classic,
    }
    for name, fn in generators.items():
        path = OUT_DIR / f"{name}.png"
        fn().save(path, "PNG", optimize=True)
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
