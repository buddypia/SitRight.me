#!/usr/bin/env python3
"""Generate localized 1200x630 OGP / Twitter Cards (en, ja, ko) for SitRight."""
import os
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCENE_BASE_PATH = os.path.join(SCRIPT_DIR, "assets", "posture-scene-base.png")

OGP_SPECS = {
    "en": {
        "out": "public/og-image.png",
        "font": "/System/Library/Fonts/SFNS.ttf",
        "tagline": "Webcam posture check",
        "eyebrow": "Prevent forward head posture, text neck, and slouching",
        "title": ["This is what your neck", "looks like from the side."],
        "tsize": 50, "tlh": 62, "body_y": 292,
        "body": [
            "Using only your laptop camera, SitRight measures how far your head",
            "juts forward, how much you look down, and how much your back rounds.",
            "Shows your side view in 3D and nudges only when bad posture persists.",
        ],
        "features": [
            ("Measured in cm & °", "Forward offset & tilt angle"),
            ("Your side view in 3D", "Compare with ideal posture"),
            ("Alerts when it matters", "Only when slouching persists"),
        ],
        "privacy": "Video never leaves this device · 100% in-browser",
        "url": "sitright.pages.dev",
        "demo": ("Demo", "Text neck"),
        "ideal": "Ideal posture",
        "load": ("Load on neck", "22 kg", "4.5× head weight"),
    },
    "ja": {
        "out": "public/og-image-ja.png",
        "fonts": (
            "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
            "/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc",
            "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        ),
        "tagline": "Webカメラで姿勢チェック",
        "eyebrow": "ストレートネック・スマホ首・猫背の予防に",
        "title": ["あなたの首、", "横から見ると", "こうなっています。"],
        "tsize": 42, "tlh": 54, "body_y": 318,
        "body": [
            "ノートPCのカメラだけで、頭の前への突き出し・うつむき・背中の丸まりを計測。",
            "正面のカメラでは見えない「横からの姿勢」を3Dで映し、",
            "悪い姿勢が続いたときだけそっと知らせます。",
        ],
        "features": [
            ("cmと角度で計測", "前方突出・うつむきを数値化"),
            ("横からの姿勢を3Dで", "理想の姿勢とのずれを比較"),
            ("必要なときだけ通知", "一瞬の前かがみでは鳴らない"),
        ],
        "privacy": "映像はこの端末から出ません（ブラウザ内で完結）",
        "url": "sitright.pages.dev/ja",
        "demo": ("デモ表示", "スマホ首"),
        "ideal": "理想の姿勢",
        "load": ("首への負担", "22 kg", "頭の重さの 4.5 倍"),
    },
    "ko": {
        "out": "public/og-image-ko.png",
        "font": "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "indices": (6, 4, 2),
        "tagline": "웹캠으로 자세 체크",
        "eyebrow": "거북목·일자목·굽은 등 예방에",
        "title": ["내 목과 등,", "옆에서 보면 이래요."],
        "tsize": 52, "tlh": 64, "body_y": 292,
        "body": [
            "노트북 카메라만으로 고개가 앞으로 나온 정도, 숙인 각도,",
            "등이 굽은 정도를 측정해 정면 카메라로는 볼 수 없는 옆모습을",
            "3D로 보여 주고, 나쁜 자세가 계속될 때만 살짝 알려 드려요.",
        ],
        "features": [
            ("cm와 각도로 측정", "앞으로 나옴·숙임 수치화"),
            ("옆에서 본 자세를 3D로", "바른 자세와 차이를 비교"),
            ("필요할 때만 알림", "잠깐 숙인 정도론 울리지 않음"),
        ],
        "privacy": "카메라 영상은 기기 밖으로 나가지 않아요",
        "url": "sitright.pages.dev/ko",
        "demo": ("데모 표시", "거북목"),
        "ideal": "바른 자세",
        "load": ("목 부담", "22 kg", "머리 무게의 4.5배"),
    },
}


def load_font(locale, weight, size):
    spec = OGP_SPECS[locale]
    w_idx = 0 if weight in ("bold", "semibold") else (1 if weight == "medium" else 2)
    if locale == "en" and os.path.exists(spec["font"]):
        f = ImageFont.truetype(spec["font"], size)
        try:
            f.set_variation_by_name({"bold": b"Bold", "semibold": b"Semibold", "medium": b"Medium"}.get(weight, b"Regular"))
            return f
        except Exception:
            pass
    if locale == "ja":
        return ImageFont.truetype(spec["fonts"][w_idx], size)
    if locale == "ko":
        return ImageFont.truetype(spec["font"], size, index=spec["indices"][w_idx])
    return ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", size, index=(1 if w_idx == 0 else 0))


def draw_vector_logo(canvas, x, y, size):
    sub = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(sub)
    s = size / 64.0
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(16 * s), fill=(20, 24, 32, 255), outline=(54, 63, 82, 255), width=max(1, int(1.5 * s)))
    for by, sy in ((41, 44), (27, 30)):
        d.rounded_rectangle((int(23 * s), int(by * s), int(37 * s), int((by + 11) * s)), radius=int(2.5 * s), fill=(44, 54, 70, 255), outline=(71, 85, 105, 255))
        d.rounded_rectangle((int(17 * s), int(sy * s), int(24 * s), int((sy + 5.5) * s)), radius=int(1.5 * s), fill=(44, 54, 70, 255))
    top = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    td = ImageDraw.Draw(top)
    td.rounded_rectangle((int(22 * s), int(13 * s), int(36 * s), int(24 * s)), radius=int(2.5 * s), fill=(62, 76, 98, 255), outline=(90, 106, 130, 255))
    td.rounded_rectangle((int(16 * s), int(16 * s), int(23 * s), int(21.5 * s)), radius=int(1.5 * s), fill=(62, 76, 98, 255))
    sub = Image.alpha_composite(sub, top.rotate(18, resample=Image.Resampling.BICUBIC, center=(28 * s, 26 * s)))
    d = ImageDraw.Draw(sub)
    d.polygon([(int(26 * s), int(27 * s)), (int(40 * s), int(20 * s)), (int(40 * s), int(34 * s))], fill=(255, 149, 0, 255))
    d.arc((int(26 * s), int(13 * s), int(49 * s), int(41 * s)), -42, 42, fill=(255, 149, 0, 255), width=max(2, int(2.8 * s)))
    d.arc((int(29 * s), int(8 * s), int(56 * s), int(46 * s)), -42, 42, fill=(255, 95, 60, 235), width=max(2, int(3.0 * s)))
    canvas.paste(sub, (x, y), sub)


def draw_lock_icon(draw, x, y, size, color):
    lw = max(2, int(size * 0.085))
    bx0, by0, bx1, by1 = x + int(size * 0.19), y + int(size * 0.44), x + int(size * 0.81), y + int(size * 0.86)
    draw.rounded_rectangle((bx0, by0, bx1, by1), radius=int(size * 0.11), outline=color, width=lw)
    sx0, sy0, sx1, sy1 = x + int(size * 0.33), y + int(size * 0.16), x + int(size * 0.67), y + int(size * 0.52)
    draw.arc((sx0, sy0, sx1, sy1), 180, 360, fill=color, width=lw)
    draw.line((sx0, (sy0 + sy1) // 2, sx0, by0), fill=color, width=lw)
    draw.line((sx1, (sy0 + sy1) // 2, sx1, by0), fill=color, width=lw)


def render_viewport_panel(locale, spec, pw_px, ph_px, S):
    panel = Image.new("RGBA", (pw_px, ph_px), (0, 0, 0, 0))
    cropped = Image.open(SCENE_BASE_PATH).convert("RGBA").crop((28, 18, 595, 610)).resize((pw_px, ph_px), Image.Resampling.LANCZOS)
    mask = Image.new("L", (pw_px, ph_px), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw_px - 1, ph_px - 1), radius=24 * S, fill=255)
    panel.paste(cropped, (0, 0), mask)

    ov = Image.new("RGBA", (pw_px, ph_px), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    sx, sy = pw_px / 567.0, ph_px / 592.0

    # 1. Top-left Demo Pill
    f_demo, f_demo_b = load_font(locale, "medium", 12 * S), load_font(locale, "semibold", 12 * S)
    p_txt, s_txt = spec["demo"]
    pb, sb = od.textbbox((0, 0), p_txt, font=f_demo), od.textbbox((0, 0), s_txt, font=f_demo_b)
    bw, bh, bx, by = (pb[2] - pb[0]) + (sb[2] - sb[0]) + 34 * S, 30 * S, 18 * S, 18 * S
    od.rounded_rectangle((bx, by, bx + bw, by + bh), radius=bh // 2, fill=(11, 13, 16, 185), outline=(255, 255, 255, 26), width=S)
    od.text((bx + 13 * S, by + (bh - (pb[3] - pb[1])) // 2 - pb[1]), p_txt, fill=(123, 131, 142, 255), font=f_demo)
    od.text((bx + 21 * S + (pb[2] - pb[0]), by + (bh - (sb[3] - sb[1])) // 2 - sb[1]), s_txt, fill=(255, 190, 92, 255), font=f_demo_b)

    # 2. Crisp "+3.2 cm" badge & Ideal Posture label
    px0, py0, px1, py1 = int(246 * sx), int(117 * sy), int(305 * sx), int(139 * sy)
    od.rounded_rectangle((px0, py0, px1, py1), radius=6 * S, fill=(255, 190, 92, 255))
    f_cm = load_font("en", "semibold", 10 * S)
    cb = od.textbbox((0, 0), "+3.2 cm", font=f_cm)
    od.text((px0 + ((px1 - px0) - (cb[2] - cb[0])) // 2 - cb[0], py0 + ((py1 - py0) - (cb[3] - cb[1])) // 2 - cb[1]), "+3.2 cm", fill=(26, 19, 6, 255), font=f_cm)

    f_ideal = load_font(locale, "medium", 12 * S)
    ib = od.textbbox((0, 0), spec["ideal"], font=f_ideal)
    od.text((int(222 * sx) - (ib[2] - ib[0]), int(74 * sy)), spec["ideal"], fill=(77, 234, 196, 255), font=f_ideal)

    # 3. Neck Load HUD Card
    l_title, l_kg, l_ratio = spec["load"]
    f_lt, f_lk, f_lr = load_font(locale, "regular", 11 * S), load_font("en", "bold", 19 * S), load_font(locale, "regular", 11 * S)
    bt, bk, br = od.textbbox((0, 0), l_title, font=f_lt), od.textbbox((0, 0), l_kg, font=f_lk), od.textbbox((0, 0), l_ratio, font=f_lr)
    cw, ch, cx, cy = max(bt[2] - bt[0], bk[2] - bk[0], br[2] - br[0]) + 24 * S, 66 * S, int(326 * sx), int(42 * sy)
    od.rounded_rectangle((cx, cy, cx + cw, cy + ch), radius=10 * S, fill=(11, 13, 16, 224), outline=(255, 255, 255, 30), width=S)
    od.text((cx + 12 * S, cy + 8 * S - bt[1]), l_title, fill=(179, 185, 194, 215), font=f_lt)
    od.text((cx + 12 * S, cy + 23 * S - bk[1]), l_kg, fill=(255, 107, 91, 255), font=f_lk)
    od.text((cx + 12 * S, cy + 47 * S - br[1]), l_ratio, fill=(179, 185, 194, 195), font=f_lr)
    od.rounded_rectangle((0, 0, pw_px - 1, ph_px - 1), radius=24 * S, outline=(255, 255, 255, 24), width=S)
    return Image.alpha_composite(panel, ov)


def generate_social_ogp_for_locale(locale, spec):
    S = 2
    W, H = 1200 * S, 630 * S
    img = Image.new("RGBA", (W, H), (11, 13, 16, 255))
    draw = ImageDraw.Draw(img)
    lx = 62 * S

    # Header Lockup
    lsize, ly = 30 * S, 48 * S
    draw_vector_logo(img, lx, ly, lsize)
    f_brand, f_tag = load_font("en", "semibold", 20 * S), load_font(locale, "regular", 14 * S)
    bb, tb = draw.textbbox((0, 0), "SitRight", font=f_brand), draw.textbbox((0, 0), spec["tagline"], font=f_tag)
    bx = lx + lsize + 12 * S
    draw.text((bx, ly + (lsize - (bb[3] - bb[1])) // 2 - bb[1]), "SitRight", fill=(238, 240, 242, 255), font=f_brand)
    draw.text((bx + (bb[2] - bb[0]) + 14 * S, ly + (lsize - (tb[3] - tb[1])) // 2 - tb[1]), spec["tagline"], fill=(123, 131, 142, 255), font=f_tag)

    # Eyebrow, Headline, Body
    draw.text((lx, 108 * S), spec["eyebrow"], fill=(77, 234, 196, 255), font=load_font(locale, "semibold", 14 * S))
    f_title = load_font(locale, "bold", spec["tsize"] * S)
    for i, line in enumerate(spec["title"]):
        draw.text((lx, (142 + i * spec["tlh"]) * S), line, fill=(238, 240, 242, 255), font=f_title)
    f_body = load_font(locale, "regular", 15 * S)
    for i, line in enumerate(spec["body"]):
        draw.text((lx, (spec["body_y"] + i * 26) * S), line, fill=(179, 185, 194, 255), font=f_body)

    # 3-Column Spec Strip
    fy, f_ft, f_fs = 428 * S, load_font(locale, "semibold", 13 * S), load_font(locale, "regular", 12 * S)
    for idx, (ft, fs) in enumerate(spec["features"]):
        cx = lx + idx * 186 * S
        draw.line((cx, fy + 2 * S, cx, fy + 48 * S), fill=(255, 255, 255, 32), width=2 * S)
        draw.text((cx + 12 * S, fy), ft, fill=(238, 240, 242, 255), font=f_ft)
        draw.text((cx + 12 * S, fy + 24 * S), fs, fill=(123, 131, 142, 255), font=f_fs)

    # Footer
    rx, foot_y = lx + 556 * S, 548 * S
    draw.line((lx, 524 * S, rx, 524 * S), fill=(255, 255, 255, 20), width=S)
    draw_lock_icon(draw, lx, foot_y, 20 * S, (77, 234, 196, 255))
    f_priv, f_url = load_font(locale, "regular", 13 * S), load_font("en", "medium", 13 * S)
    pb, ub = draw.textbbox((0, 0), spec["privacy"], font=f_priv), draw.textbbox((0, 0), spec["url"], font=f_url)
    draw.text((lx + 26 * S, foot_y + (20 * S - (pb[3] - pb[1])) // 2 - pb[1]), spec["privacy"], fill=(179, 185, 194, 255), font=f_priv)
    draw.text((rx - (ub[2] - ub[0]), foot_y + (20 * S - (ub[3] - ub[1])) // 2 - ub[1]), spec["url"], fill=(77, 234, 196, 255), font=f_url)

    # Right 3D Panel
    panel = render_viewport_panel(locale, spec, 488 * S, 546 * S, S)
    img.paste(panel, (656 * S, 42 * S), panel)

    final_img = img.resize((1200, 630), Image.Resampling.LANCZOS).convert("RGB")
    os.makedirs(os.path.dirname(spec["out"]), exist_ok=True)
    final_img.save(spec["out"], "PNG", optimize=True)
    if locale == "en":
        for alias in ("public/twitter-image.png", "public/opengraph-image.png"):
            final_img.save(alias, "PNG", optimize=True)


if __name__ == "__main__":
    for loc, spec in OGP_SPECS.items():
        generate_social_ogp_for_locale(loc, spec)
