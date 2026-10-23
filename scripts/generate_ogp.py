#!/usr/bin/env python3
"""
Generate localized Social OGP / Twitter Cards (1200x630) for SitRight (en, ja, ko)
and legacy aliases (/twitter-image.png, /opengraph-image.png).

Design direction:
- Anti-slop dark editorial / clinical instrument layout matching Welcome.tsx & globals.css
- Palette: --bg (#0b0d10), --surface-1 (#14171c), --ink-1 (#eef0f2), --ink-2 (#b3b9c2),
  --ink-3 (#7b838e), --good (#4deac4), --fair (#ffbe5c), --poor (#ff6b5b)
- Left column: Vector brand lockup, #4deac4 eyebrow, canonical welcomeTitle headline,
  concise body copy, 3-column left-bordered spec strip (no pill badges / no neon glows),
  and on-device privacy footer with vector lock icon.
- Right column: Authentic 3D side-view viewport (PostureScene) with localized HUD labels.
"""
import os
from PIL import Image, ImageDraw, ImageFont


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCENE_BASE_PATH = os.path.join(SCRIPT_DIR, "assets", "posture-scene-base.png")


OGP_SPECS = {
    "en": {
        "out": "public/og-image.png",
        "font_path": "/System/Library/Fonts/SFNS.ttf",
        "tagline": "Webcam posture check",
        "eyebrow": "Prevent forward head posture, text neck, and slouching",
        "title_lines": [
            "This is what your neck",
            "looks like from the side.",
        ],
        "title_size": 50,
        "title_lh": 62,
        "body_y": 292,
        "body_lines": [
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
        "demo_prefix": "Demo",
        "demo_state": "Text neck",
        "ideal_label": "Ideal posture",
        "load_title": "Load on neck",
        "load_kg": "22 kg",
        "load_ratio": "4.5× head weight",
    },
    "ja": {
        "out": "public/og-image-ja.png",
        "font_bold": "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "font_med": "/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc",
        "font_reg": "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "tagline": "Webカメラで姿勢チェック",
        "eyebrow": "ストレートネック・スマホ首・猫背の予防に",
        "title_lines": [
            "あなたの首、",
            "横から見ると",
            "こうなっています。",
        ],
        "title_size": 42,
        "title_lh": 54,
        "body_y": 318,
        "body_lines": [
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
        "demo_prefix": "デモ表示",
        "demo_state": "スマホ首",
        "ideal_label": "理想の姿勢",
        "load_title": "首への負担",
        "load_kg": "22 kg",
        "load_ratio": "頭の重さの 4.5 倍",
    },
    "ko": {
        "out": "public/og-image-ko.png",
        "font_bold": "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "font_med": "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "font_reg": "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "bold_idx": 6,
        "med_idx": 4,
        "reg_idx": 2,
        "tagline": "웹캠으로 자세 체크",
        "eyebrow": "거북목·일자목·굽은 등 예방에",
        "title_lines": [
            "내 목과 등,",
            "옆에서 보면 이래요.",
        ],
        "title_size": 52,
        "title_lh": 64,
        "body_y": 292,
        "body_lines": [
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
        "demo_prefix": "데모 표시",
        "demo_state": "거북목",
        "ideal_label": "바른 자세",
        "load_title": "목 부담",
        "load_kg": "22 kg",
        "load_ratio": "머리 무게의 4.5배",
    },
}


def load_font(locale, weight, size):
    """Load crisp system font at requested size (already scaled by S)."""
    spec = OGP_SPECS[locale]
    if locale == "en":
        sf_path = spec["font_path"]
        if os.path.exists(sf_path):
            f = ImageFont.truetype(sf_path, size)
            var_map = {
                "bold": b"Bold",
                "semibold": b"Semibold",
                "medium": b"Medium",
                "regular": b"Regular",
            }
            try:
                f.set_variation_by_name(var_map.get(weight, b"Regular"))
                return f
            except Exception:
                pass
        hn = "/System/Library/Fonts/HelveticaNeue.ttc"
        idx = 1 if weight in ("bold", "semibold") else (10 if weight == "medium" else 0)
        return ImageFont.truetype(hn, size, index=idx)

    if locale == "ja":
        key = "font_bold" if weight in ("bold", "semibold") else ("font_med" if weight == "medium" else "font_reg")
        path = spec[key]
        if os.path.exists(path):
            return ImageFont.truetype(path, size)

    if locale == "ko":
        path = spec["font_bold"]
        idx_key = "bold_idx" if weight in ("bold", "semibold") else ("med_idx" if weight == "medium" else "reg_idx")
        if os.path.exists(path):
            return ImageFont.truetype(path, size, index=spec[idx_key])

    return ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", size)


def load_latin_font(weight, size):
    """Load SF Pro / Helvetica Neue for Latin brand / tabular numerals."""
    return load_font("en", weight, size)


def draw_vector_logo(canvas, x, y, size):
    """Draw the crisp vector SitRight mark (matching src/app/icon.svg) at (x, y, size)."""
    sub = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(sub)
    s = size / 64.0

    # Squircle background & subtle rim
    d.rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=int(16 * s),
        fill=(20, 24, 32, 255),
        outline=(54, 63, 82, 255),
        width=max(1, int(1.5 * s)),
    )

    # Lower 2 upright vertebrae
    for by, sy in ((41, 44), (27, 30)):
        d.rounded_rectangle(
            (int(23 * s), int(by * s), int(37 * s), int((by + 11) * s)),
            radius=max(1, int(2.5 * s)),
            fill=(44, 54, 70, 255),
            outline=(71, 85, 105, 255),
            width=max(1, int(0.9 * s)),
        )
        d.rounded_rectangle(
            (int(17 * s), int(sy * s), int(24 * s), int((sy + 5.5) * s)),
            radius=max(1, int(1.5 * s)),
            fill=(44, 54, 70, 255),
        )

    # Upper tilted vertebra (drawn on rotated layer)
    top_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    td = ImageDraw.Draw(top_layer)
    td.rounded_rectangle(
        (int(22 * s), int(13 * s), int(36 * s), int(24 * s)),
        radius=max(1, int(2.5 * s)),
        fill=(62, 76, 98, 255),
        outline=(90, 106, 130, 255),
        width=max(1, int(0.9 * s)),
    )
    td.rounded_rectangle(
        (int(16 * s), int(16 * s), int(23 * s), int(21.5 * s)),
        radius=max(1, int(1.5 * s)),
        fill=(62, 76, 98, 255),
    )
    top_rotated = top_layer.rotate(18, resample=Image.Resampling.BICUBIC, center=(28 * s, 26 * s))
    sub = Image.alpha_composite(sub, top_rotated)
    d = ImageDraw.Draw(sub)

    # Amber wedge & acoustic arcs
    d.polygon(
        [(int(26 * s), int(27 * s)), (int(40 * s), int(20 * s)), (int(40 * s), int(34 * s))],
        fill=(255, 149, 0, 255),
    )
    d.arc(
        (int(26 * s), int(13 * s), int(49 * s), int(41 * s)),
        start=-42,
        end=42,
        fill=(255, 149, 0, 255),
        width=max(2, int(2.8 * s)),
    )
    d.arc(
        (int(29 * s), int(8 * s), int(56 * s), int(46 * s)),
        start=-42,
        end=42,
        fill=(255, 95, 60, 235),
        width=max(2, int(3.0 * s)),
    )

    canvas.paste(sub, (x, y), sub)


def draw_lock_icon(draw, x, y, size, color):
    """Draw the crisp vector LockIcon from Welcome.tsx."""
    lw = max(2, int(size * 0.085))
    bx0 = x + int(size * 0.19)
    by0 = y + int(size * 0.44)
    bx1 = x + int(size * 0.81)
    by1 = y + int(size * 0.86)
    draw.rounded_rectangle((bx0, by0, bx1, by1), radius=int(size * 0.11), outline=color, width=lw)
    sx0 = x + int(size * 0.33)
    sy0 = y + int(size * 0.16)
    sx1 = x + int(size * 0.67)
    sy1 = y + int(size * 0.52)
    draw.arc((sx0, sy0, sx1, sy1), start=180, end=360, fill=color, width=lw)
    draw.line((sx0, (sy0 + sy1) // 2, sx0, by0), fill=color, width=lw)
    draw.line((sx1, (sy0 + sy1) // 2, sx1, by0), fill=color, width=lw)


def render_viewport_panel(locale, spec, panel_w, panel_h, S):
    """Render the right-hand 3D PostureScene panel with localized HUD overlays."""
    panel = Image.new("RGBA", (panel_w, panel_h), (0, 0, 0, 0))

    # Load clean 3D posture render and fit cleanly into panel
    scene_src = Image.open(SCENE_BASE_PATH).convert("RGBA")
    # Crop slightly to focus on the upper body, spine, weights, and desk
    # Original size: 623x628. Crop (28, 18, 595, 610) -> 567x592
    cropped = scene_src.crop((28, 18, 595, 610))
    resized_scene = cropped.resize((panel_w, panel_h), Image.Resampling.LANCZOS)

    # Apply rounded rectangle mask
    mask = Image.new("L", (panel_w, panel_h), 0)
    mdraw = ImageDraw.Draw(mask)
    radius = 24 * S
    mdraw.rounded_rectangle((0, 0, panel_w - 1, panel_h - 1), radius=radius, fill=255)
    panel.paste(resized_scene, (0, 0), mask)

    # Overlay HUD elements inside the 3D viewport
    overlay = Image.new("RGBA", (panel_w, panel_h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    # Scale factor from cropped (567x592) to (panel_w, panel_h)
    sx = panel_w / 567.0
    sy = panel_h / 592.0

    # 1. Top-left Demo Status Pill (subtle dark translucent badge matching Welcome.tsx)
    font_demo = load_font(locale, "medium", 12 * S)
    font_demo_bold = load_font(locale, "semibold", 12 * S)
    p_text = spec["demo_prefix"]
    s_text = spec["demo_state"]
    pb = odraw.textbbox((0, 0), p_text, font=font_demo)
    sb = odraw.textbbox((0, 0), s_text, font=font_demo_bold)
    pw = (pb[2] - pb[0]) + (sb[2] - sb[0]) + 34 * S
    ph = 30 * S
    px, py = 18 * S, 18 * S
    odraw.rounded_rectangle(
        (px, py, px + pw, py + ph),
        radius=ph // 2,
        fill=(11, 13, 16, 185),
        outline=(255, 255, 255, 26),
        width=1 * S,
    )
    ty_p = py + (ph - (pb[3] - pb[1])) // 2 - pb[1]
    ty_s = py + (ph - (sb[3] - sb[1])) // 2 - sb[1]
    odraw.text((px + 13 * S, ty_p), p_text, fill=(123, 131, 142, 255), font=font_demo)
    odraw.text(
        (px + 13 * S + (pb[2] - pb[0]) + 8 * S, ty_s),
        s_text,
        fill=(255, 190, 92, 255),
        font=font_demo_bold,
    )

    # 2. Crisp @2x "+3.2 cm" amber badge directly over the raster badge for sharp typography
    # In cropped (567x592) space, the "+3.2 cm" pill is at (247, 118, 304, 138)
    pill_x0 = int(246 * sx)
    pill_y0 = int(117 * sy)
    pill_x1 = int(305 * sx)
    pill_y1 = int(139 * sy)
    odraw.rounded_rectangle(
        (pill_x0, pill_y0, pill_x1, pill_y1),
        radius=6 * S,
        fill=(255, 190, 92, 255),
    )
    font_cm = load_latin_font("semibold", 10 * S)
    cm_text = "+3.2 cm"
    cb = odraw.textbbox((0, 0), cm_text, font=font_cm)
    cm_x = pill_x0 + ((pill_x1 - pill_x0) - (cb[2] - cb[0])) // 2 - cb[0]
    cm_y = pill_y0 + ((pill_y1 - pill_y0) - (cb[3] - cb[1])) // 2 - cb[1]
    odraw.text((cm_x, cm_y), cm_text, fill=(26, 19, 6, 255), font=font_cm)

    # 3. Localized "Ideal posture" label (#4deac4) to the top-left of the green silhouette
    font_ideal = load_font(locale, "medium", 12 * S)
    ib = odraw.textbbox((0, 0), spec["ideal_label"], font=font_ideal)
    iw = ib[2] - ib[0]
    ix = int(222 * sx) - iw
    iy = int(74 * sy)
    odraw.text((ix, iy), spec["ideal_label"], fill=(77, 234, 196, 255), font=font_ideal)

    # 4. Localized Neck Load HUD card to the top-right of the weight plates
    font_load_title = load_font(locale, "regular", 11 * S)
    font_load_kg = load_latin_font("bold", 19 * S)
    font_load_ratio = load_font(locale, "regular", 11 * S)

    b_title = odraw.textbbox((0, 0), spec["load_title"], font=font_load_title)
    b_kg = odraw.textbbox((0, 0), spec["load_kg"], font=font_load_kg)
    b_ratio = odraw.textbbox((0, 0), spec["load_ratio"], font=font_load_ratio)

    card_w = max(b_title[2] - b_title[0], b_kg[2] - b_kg[0], b_ratio[2] - b_ratio[0]) + 24 * S
    card_h = 66 * S
    card_x = int(326 * sx)
    card_y = int(42 * sy)

    odraw.rounded_rectangle(
        (card_x, card_y, card_x + card_w, card_y + card_h),
        radius=10 * S,
        fill=(11, 13, 16, 224),
        outline=(255, 255, 255, 30),
        width=1 * S,
    )
    odraw.text(
        (card_x + 12 * S, card_y + 8 * S - b_title[1]),
        spec["load_title"],
        fill=(179, 185, 194, 215),
        font=font_load_title,
    )
    odraw.text(
        (card_x + 12 * S, card_y + 23 * S - b_kg[1]),
        spec["load_kg"],
        fill=(255, 107, 91, 255),
        font=font_load_kg,
    )
    odraw.text(
        (card_x + 12 * S, card_y + 47 * S - b_ratio[1]),
        spec["load_ratio"],
        fill=(179, 185, 194, 195),
        font=font_load_ratio,
    )

    # Outer border of the 3D viewport panel
    odraw.rounded_rectangle(
        (0, 0, panel_w - 1, panel_h - 1),
        radius=radius,
        outline=(255, 255, 255, 24),
        width=1 * S,
    )

    return Image.alpha_composite(panel, overlay)


def generate_social_ogp_for_locale(locale, spec):
    """Generate 1200x630 OGP card rendered at 2x supersampling (2400x1260 -> 1200x630)."""
    S = 2
    W, H = 1200 * S, 630 * S

    # Base canvas: --bg (#0b0d10)
    img = Image.new("RGBA", (W, H), (11, 13, 16, 255))
    draw = ImageDraw.Draw(img)

    left_x = 62 * S

    # 1. Brand Lockup (y = 48)
    logo_size = 30 * S
    logo_y = 48 * S
    draw_vector_logo(img, left_x, logo_y, logo_size)

    font_brand = load_latin_font("semibold", 20 * S)
    font_tagline = load_font(locale, "regular", 14 * S)
    bb = draw.textbbox((0, 0), "SitRight", font=font_brand)
    brand_x = left_x + logo_size + 12 * S
    brand_y = logo_y + (logo_size - (bb[3] - bb[1])) // 2 - bb[1]
    draw.text((brand_x, brand_y), "SitRight", fill=(238, 240, 242, 255), font=font_brand)

    tb = draw.textbbox((0, 0), spec["tagline"], font=font_tagline)
    tag_x = brand_x + (bb[2] - bb[0]) + 14 * S
    tag_y = logo_y + (logo_size - (tb[3] - tb[1])) // 2 - tb[1]
    draw.text((tag_x, tag_y), spec["tagline"], fill=(123, 131, 142, 255), font=font_tagline)

    # 2. Eyebrow in --good (#4deac4) — plain text, no pill border
    font_eyebrow = load_font(locale, "semibold", 14 * S)
    eyebrow_y = 108 * S
    draw.text((left_x, eyebrow_y), spec["eyebrow"], fill=(77, 234, 196, 255), font=font_eyebrow)

    # 3. Hero Headline (welcomeTitle)
    font_title = load_font(locale, "bold", spec["title_size"] * S)
    cur_y = 142 * S
    for line in spec["title_lines"]:
        draw.text((left_x, cur_y), line, fill=(238, 240, 242, 255), font=font_title)
        cur_y += spec["title_lh"] * S

    # 4. Lead Description
    font_body = load_font(locale, "regular", 15 * S)
    body_y = spec["body_y"] * S
    for line in spec["body_lines"]:
        draw.text((left_x, body_y), line, fill=(179, 185, 194, 255), font=font_body)
        body_y += 26 * S

    # 5. 3-Column Left-Bordered Editorial Spec Strip (matching Welcome.tsx)
    features_y = 428 * S
    col_w = 186 * S
    font_feat_title = load_font(locale, "semibold", 13 * S)
    font_feat_sub = load_font(locale, "regular", 12 * S)

    for idx, (f_title, f_sub) in enumerate(spec["features"]):
        cx = left_x + idx * col_w
        # Left vertical border hairline (--line)
        draw.line(
            (cx, features_y + 2 * S, cx, features_y + 48 * S),
            fill=(255, 255, 255, 32),
            width=2 * S,
        )
        tx = cx + 12 * S
        draw.text((tx, features_y), f_title, fill=(238, 240, 242, 255), font=font_feat_title)
        draw.text((tx, features_y + 24 * S), f_sub, fill=(123, 131, 142, 255), font=font_feat_sub)

    # 6. Bottom Privacy & Domain Bar
    divider_y = 524 * S
    left_col_right = left_x + 556 * S
    draw.line((left_x, divider_y, left_col_right, divider_y), fill=(255, 255, 255, 20), width=1 * S)

    footer_y = 548 * S
    draw_lock_icon(draw, left_x, footer_y, 20 * S, (77, 234, 196, 255))

    font_privacy = load_font(locale, "regular", 13 * S)
    pb_box = draw.textbbox((0, 0), spec["privacy"], font=font_privacy)
    py_text = footer_y + (20 * S - (pb_box[3] - pb_box[1])) // 2 - pb_box[1]
    draw.text((left_x + 26 * S, py_text), spec["privacy"], fill=(179, 185, 194, 255), font=font_privacy)

    font_url = load_latin_font("medium", 13 * S)
    ub = draw.textbbox((0, 0), spec["url"], font=font_url)
    uw = ub[2] - ub[0]
    uy_text = footer_y + (20 * S - (ub[3] - ub[1])) // 2 - ub[1]
    draw.text((left_col_right - uw, uy_text), spec["url"], fill=(77, 234, 196, 255), font=font_url)

    # 7. Right-hand 3D Side-View Viewport Panel
    panel_w = 488 * S
    panel_h = 546 * S
    panel_x = 656 * S
    panel_y = 42 * S
    panel_img = render_viewport_panel(locale, spec, panel_w, panel_h, S)
    img.paste(panel_img, (panel_x, panel_y), panel_img)

    # Downsample 2x -> 1x with LANCZOS for crisp typography and anti-aliased edges
    final_img = img.resize((1200, 630), Image.Resampling.LANCZOS).convert("RGB")
    os.makedirs(os.path.dirname(spec["out"]), exist_ok=True)
    final_img.save(spec["out"], "PNG", optimize=True)
    print(f"Saved OGP card ({locale}): {spec['out']} (1200x630)")

    if locale == "en":
        for alias in ("public/twitter-image.png", "public/opengraph-image.png"):
            final_img.save(alias, "PNG", optimize=True)
            print(f"Saved legacy OGP alias: {alias} (1200x630)")


if __name__ == "__main__":
    for loc, spec in OGP_SPECS.items():
        generate_social_ogp_for_locale(loc, spec)
    print("\nAll localized OGP assets generated successfully!")
