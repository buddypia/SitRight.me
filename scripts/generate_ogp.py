#!/usr/bin/env python3
"""
Generate complete asset suite for SitRight based on 10C Master Visual:
- High-res cropped transparent squircle
- Multi-resolution App / PWA icons (512, 192, 72)
- Maskable PWA icon (512 with safe padding)
- Apple Touch Icon (180x180)
- Favicon (.ico multi-resolution)
- Localized Social OGP / Twitter Cards (1200x630) for en, ja, and ko
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter


def extract_perfect_squircle():
    """Extract the titanium squircle precisely with ultra-smooth antialiasing."""
    master_path = '.tmp/design-proposals/bone-variant-10c-modular-shear.png'
    if not os.path.exists(master_path):
        fallback_master = '../../.tmp/design-proposals/bone-variant-10c-modular-shear.png'
        if os.path.exists(fallback_master):
            master_path = fallback_master
        elif os.path.exists('public/icon-512x512.png'):
            return Image.open('public/icon-512x512.png').convert('RGBA')

    src = Image.open(master_path).convert('RGBA')

    box_x0, box_y0 = 199, 196
    size = 626
    plate = src.crop((box_x0, box_y0, box_x0 + size, box_y0 + size))

    scale = 4
    mask_size = size * scale
    mask_hi = Image.new('L', (mask_size, mask_size), 0)
    draw = ImageDraw.Draw(mask_hi)

    radius = int(148 * scale)
    draw.rounded_rectangle((0, 0, mask_size, mask_size), radius=radius, fill=255)

    mask = mask_hi.resize((size, size), Image.Resampling.LANCZOS)
    plate.putalpha(mask)
    return plate


def generate_app_and_pwa_icons(squircle):
    """Generate multi-resolution PWA & browser icons."""
    os.makedirs('public', exist_ok=True)

    sizes = [
        (512, 'public/icon-512x512.png'),
        (192, 'public/icon-192x192.png'),
        (72, 'public/icon-72x72.png'),
    ]
    for s, path in sizes:
        resized = squircle.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(path, 'PNG', optimize=True)
        print(f"Saved: {path} ({s}x{s})")

    apple_icon = Image.new('RGBA', (180, 180), (11, 13, 16, 255))
    apple_squircle = squircle.resize((172, 172), Image.Resampling.LANCZOS)
    apple_icon.paste(apple_squircle, (4, 4), apple_squircle)
    apple_icon.convert('RGB').save('public/apple-touch-icon.png', 'PNG', optimize=True)
    print("Saved: public/apple-touch-icon.png (180x180)")

    maskable = Image.new('RGBA', (512, 512), (11, 13, 16, 255))
    content_size = 400
    m_squircle = squircle.resize((content_size, content_size), Image.Resampling.LANCZOS)
    offset = (512 - content_size) // 2
    maskable.paste(m_squircle, (offset, offset), m_squircle)
    maskable.save('public/icon-maskable-512x512.png', 'PNG', optimize=True)
    print("Saved: public/icon-maskable-512x512.png (512x512 with safe zone)")

    ico_sizes = [(64, 64), (48, 48), (32, 32), (16, 16)]
    ico_images = [squircle.resize(sz, Image.Resampling.LANCZOS) for sz in ico_sizes]
    ico_images[0].save('public/favicon.ico', format='ICO', sizes=ico_sizes)
    print("Saved: public/favicon.ico (multi-size ICO)")


OGP_SPECS = {
    'en': {
        'out': 'public/og-image.png',
        'font_bold': '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        'font_reg': '/System/Library/Fonts/Supplemental/Arial.ttf',
        'badge': 'WEBCAM POSTURE MONITOR',
        'sub1': 'Check forward head posture, text neck, and slouching',
        'sub2': 'in a 3D side view. Alerts only when it persists.',
        'tags': [
            ('100% IN-BROWSER', (56, 189, 248)),
            ('NO SIGN-UP', (255, 149, 0)),
            ('3D SIDE VIEW', (74, 222, 128)),
        ],
        'footer_note': 'Runs entirely in your browser',
        'footer_url': 'sitright.pages.dev',
    },
    'ja': {
        'out': 'public/og-image-ja.png',
        'font_bold': '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
        'font_reg': '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        'badge': 'Webカメラだけで姿勢チェック',
        'sub1': 'ストレートネック・スマホ首・猫背を計測し、',
        'sub2': '横からの3D表示と通知で知らせます。',
        'tags': [
            ('ブラウザ内で完結', (56, 189, 248)),
            ('登録・インストール不要', (255, 149, 0)),
            ('横からの3D表示', (74, 222, 128)),
        ],
        'footer_note': 'カメラ映像は端末の外に出ません',
        'footer_url': 'sitright.pages.dev/ja',
    },
    'ko': {
        'out': 'public/og-image-ko.png',
        'font_bold': '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        'font_reg': '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        'font_bold_index': 6,
        'font_reg_index': 2,
        'badge': '웹캠만으로 앉은 자세 체크',
        'sub1': '일자목·거북목·굽은 등을 측정하고,',
        'sub2': '옆에서 본 3D 화면과 알림으로 알려 드려요.',
        'tags': [
            ('브라우저 안에서만 처리', (56, 189, 248)),
            ('설치·가입 불필요', (255, 149, 0)),
            ('옆모습 3D 표시', (74, 222, 128)),
        ],
        'footer_note': '카메라 영상은 기기 밖으로 나가지 않아요',
        'footer_url': 'sitright.pages.dev/ko',
    },
}


def load_font(path, size, index=0):
    if os.path.exists(path):
        try:
            return ImageFont.truetype(path, size, index=index)
        except Exception:
            return ImageFont.truetype(path, size)
    return ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size)


def generate_social_ogp_for_locale(squircle, locale, spec):
    """Generate 1200x630 OGP card for SNS (X/Twitter, Facebook, Slack, LINE, KakaoTalk, Discord)."""
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), (11, 13, 16, 255))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)

    center_x, center_y = 300, 315
    for r in range(340, 0, -4):
        alpha = int(55 * (1 - r / 340) ** 1.6)
        glow_draw.ellipse(
            (center_x - r, center_y - r, center_x + r, center_y + r),
            fill=(255, 95, 0, alpha),
        )

    for r in range(450, 0, -10):
        alpha = int(20 * (1 - r / 450) ** 2)
        glow_draw.ellipse(
            (1020 - r, 100 - r, 1020 + r, 100 + r),
            fill=(30, 80, 160, alpha),
        )

    img = Image.alpha_composite(img, glow)

    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    for x in range(0, W, 40):
        grid_draw.line((x, 0, x, H), fill=(255, 255, 255, 4))
    for y in range(0, H, 40):
        grid_draw.line((0, y, W, y), fill=(255, 255, 255, 4))
    img = Image.alpha_composite(img, grid)

    icon_size = 410
    icon_resized = squircle.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    icon_x = 85
    icon_y = 110

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_offset = 16
    corner_radius = int(icon_size * 0.236)
    shadow_draw.rounded_rectangle(
        (icon_x, icon_y + shadow_offset, icon_x + icon_size, icon_y + icon_size + shadow_offset),
        radius=corner_radius,
        fill=(0, 0, 0, 180),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=26))
    img = Image.alpha_composite(img, shadow)
    img.paste(icon_resized, (icon_x, icon_y), icon_resized)

    draw = ImageDraw.Draw(img)

    latin_bold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
    bold_idx = spec.get('font_bold_index', 0)
    reg_idx = spec.get('font_reg_index', 0)

    font_title = load_font(latin_bold, 82)
    font_badge = load_font(spec['font_bold'], 16, bold_idx)
    font_sub = load_font(spec['font_reg'], 24 if locale == 'en' else 25, reg_idx)
    font_tag = load_font(spec['font_bold'], 14, bold_idx)
    font_footer_note = load_font(spec['font_reg'], 17, reg_idx)
    font_footer_url = load_font(latin_bold, 18)

    text_x = 545

    # 1. Pill Badge
    badge_y = 114
    badge_bbox = draw.textbbox((0, 0), spec['badge'], font=font_badge)
    badge_w = (badge_bbox[2] - badge_bbox[0]) + 52
    badge_h = 34
    pill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pill_draw = ImageDraw.Draw(pill)
    pill_draw.rounded_rectangle(
        (text_x, badge_y, text_x + badge_w, badge_y + badge_h),
        radius=17,
        fill=(22, 28, 40, 220),
        outline=(48, 64, 94, 255),
        width=1,
    )
    img = Image.alpha_composite(img, pill)
    draw = ImageDraw.Draw(img)
    draw.ellipse((text_x + 14, badge_y + 12, text_x + 24, badge_y + 22), fill=(255, 149, 0, 255))
    text_offset_y = (badge_h - (badge_bbox[3] - badge_bbox[1])) // 2 - badge_bbox[1]
    draw.text((text_x + 32, badge_y + text_offset_y), spec['badge'], fill=(226, 232, 240, 255), font=font_badge)

    # 2. Brand Name: "SitRight"
    title_y = 168
    draw.text((text_x, title_y), "SitRight", fill=(255, 255, 255, 255), font=font_title)

    # 3. Subtitle Copy
    sub_y = 282
    draw.text((text_x, sub_y), spec['sub1'], fill=(226, 232, 240, 255), font=font_sub)
    draw.text((text_x, sub_y + 38), spec['sub2'], fill=(148, 163, 184, 255), font=font_sub)

    # 4. Feature Pills
    tags_y = 392
    tag_h = 36
    cur_tag_x = text_x
    for label, dot_color in spec['tags']:
        bbox = draw.textbbox((0, 0), label, font=font_tag)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        tag_w = text_w + 42

        tag_pill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        tag_pill_draw = ImageDraw.Draw(tag_pill)
        tag_pill_draw.rounded_rectangle(
            (cur_tag_x, tags_y, cur_tag_x + tag_w, tags_y + tag_h),
            radius=18,
            fill=(18, 22, 30, 220),
            outline=(40, 48, 64, 255),
            width=1,
        )
        img = Image.alpha_composite(img, tag_pill)
        draw = ImageDraw.Draw(img)
        draw.ellipse((cur_tag_x + 13, tags_y + 14, cur_tag_x + 21, tags_y + 22), fill=dot_color + (255,))
        ty = tags_y + (tag_h - text_h) // 2 - bbox[1]
        draw.text((cur_tag_x + 27, ty), label, fill=(226, 232, 240, 255), font=font_tag)
        cur_tag_x += tag_w + 10

    # 5. Bottom Callout / URL
    bottom_y = 472
    draw.line((text_x, bottom_y, W - 75, bottom_y), fill=(30, 38, 52, 255), width=1)

    note_bbox = draw.textbbox((0, 0), spec['footer_note'], font=font_footer_note)
    note_y = bottom_y + 20 - note_bbox[1]
    draw.text((text_x, note_y), spec['footer_note'], fill=(148, 163, 184, 255), font=font_footer_note)

    note_w = note_bbox[2] - note_bbox[0]
    sep_x = text_x + note_w + 14
    url_bbox = draw.textbbox((0, 0), spec['footer_url'], font=font_footer_url)
    url_y = bottom_y + 20 - url_bbox[1]
    draw.text((sep_x, url_y), "—", fill=(71, 85, 105, 255), font=font_footer_url)
    draw.text((sep_x + 26, url_y), spec['footer_url'], fill=(255, 149, 0, 255), font=font_footer_url)

    final_rgb = img.convert("RGB")
    final_rgb.save(spec['out'], "PNG", optimize=True)
    print(f"Saved OGP card ({locale}): {spec['out']} ({W}x{H})")


if __name__ == "__main__":
    squircle = extract_perfect_squircle()
    for loc, spec in OGP_SPECS.items():
        generate_social_ogp_for_locale(squircle, loc, spec)
    print("\nAll localized OGP assets generated successfully!")
