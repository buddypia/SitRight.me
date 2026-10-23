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
        'font_bold': '/System/Library/Fonts/HelveticaNeue.ttc',
        'font_reg': '/System/Library/Fonts/HelveticaNeue.ttc',
        'font_bold_index': 1,
        'font_reg_index': 0,
        'badge': 'Prevent forward head posture, text neck, and slouching',
        'title': ['This is what your neck', 'looks like from the side.'],
        'sub1': 'Using only your laptop camera, SitRight measures how far your head',
        'sub2': 'juts forward, how much you look down, and how much your back rounds.',
        'sub3': 'Shows your side view in 3D and nudges only when bad posture persists.',
        'tags': [
            ('Measured in cm & °', 'Forward offset & tilt angle'),
            ('Your side view in 3D', 'Compare with ideal posture'),
            ('Alerts when it matters', 'Only when slouching persists'),
        ],
        'demo': ('Demo', 'Text neck', 'Ideal posture', 'Load on neck', '4.5× head weight'),
        'footer_note': 'Video never leaves this device · 100% in-browser',
        'footer_url': 'sitright.pages.dev',
    },
    'ja': {
        'out': 'public/og-image-ja.png',
        'font_bold': '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
        'font_reg': '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        'badge': 'ストレートネック・スマホ首・猫背の予防に',
        'title': ['あなたの首、', '横から見ると', 'こうなっています。'],
        'sub1': 'ノートPCのカメラだけで、頭の前への突き出し・うつむき・背中の丸まりを計測。',
        'sub2': '正面のカメラでは見えない「横からの姿勢」を3Dで映し、',
        'sub3': '悪い姿勢が続いたときだけそっと知らせます。',
        'tags': [
            ('cmと角度で計測', '前方突出・うつむきを数値化'),
            ('横からの姿勢を3Dで', '理想の姿勢とのずれを比較'),
            ('必要なときだけ通知', '一瞬の前かがみでは鳴らない'),
        ],
        'demo': ('デモ表示', 'スマホ首', '理想の姿勢', '首への負担', '頭の重さの 4.5 倍'),
        'footer_note': '映像はこの端末から出ません（ブラウザ内で完結）',
        'footer_url': 'sitright.pages.dev/ja',
    },
    'ko': {
        'out': 'public/og-image-ko.png',
        'font_bold': '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        'font_reg': '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        'font_bold_index': 6,
        'font_reg_index': 2,
        'badge': '거북목·일자목·굽은 등 예방에',
        'title': ['내 목과 등,', '옆에서 보면 이래요.'],
        'sub1': '노트북 카메라만으로 고개가 앞으로 나온 정도, 숙인 각도,',
        'sub2': '등이 굽은 정도를 측정해 정면 카메라로는 볼 수 없는 옆모습을',
        'sub3': '3D로 보여 주고, 나쁜 자세가 계속될 때만 살짝 알려 드려요.',
        'tags': [
            ('cm와 각도로 측정', '앞으로 나옴·숙임 수치화'),
            ('옆에서 본 자세를 3D로', '바른 자세와 차이를 비교'),
            ('필요할 때만 알림', '잠깐 숙인 정도론 울리지 않음'),
        ],
        'demo': ('데모 표시', '거북목', '바른 자세', '목 부담', '머리 무게의 4.5배'),
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
    S = 2
    W, H = 1200 * S, 630 * S
    img = Image.new("RGBA", (W, H), (11, 13, 16, 255))
    draw = ImageDraw.Draw(img)

    latin_bold = '/System/Library/Fonts/HelveticaNeue.ttc'
    bold_idx = spec.get('font_bold_index', 0)
    reg_idx = spec.get('font_reg_index', 0)

    tsize = 42 if len(spec['title']) == 3 else 50
    tlh = 54 if len(spec['title']) == 3 else 62
    font_brand = load_font(latin_bold, 20 * S, 1)
    font_title = load_font(spec['font_bold'], tsize * S, bold_idx)
    font_badge = load_font(spec['font_bold'], 14 * S, bold_idx)
    font_sub = load_font(spec['font_reg'], 15 * S, reg_idx)
    font_tag_b = load_font(spec['font_bold'], 13 * S, bold_idx)
    font_tag_r = load_font(spec['font_reg'], 12 * S, reg_idx)
    font_footer_note = load_font(spec['font_reg'], 13 * S, reg_idx)
    font_footer_url = load_font(latin_bold, 13 * S, 10)

    lx = 62 * S
    icon_s = 30 * S
    img.paste(squircle.resize((icon_s, icon_s), Image.Resampling.LANCZOS), (lx, 48 * S))
    draw.text((lx + 42 * S, 51 * S), "SitRight", fill=(238, 240, 242, 255), font=font_brand)
    draw.text((lx, 108 * S), spec['badge'], fill=(77, 234, 196, 255), font=font_badge)

    for i, line in enumerate(spec['title']):
        draw.text((lx, (142 + i * tlh) * S), line, fill=(238, 240, 242, 255), font=font_title)

    by = (318 if len(spec['title']) == 3 else 292) * S
    for i, k in enumerate(('sub1', 'sub2', 'sub3')):
        draw.text((lx, by + i * 26 * S), spec[k], fill=(179, 185, 194, 255), font=font_sub)

    fy = 428 * S
    for idx, (ft, fs) in enumerate(spec['tags']):
        cx = lx + idx * 186 * S
        draw.line((cx, fy + 2 * S, cx, fy + 48 * S), fill=(255, 255, 255, 32), width=2 * S)
        draw.text((cx + 12 * S, fy), ft, fill=(238, 240, 242, 255), font=font_tag_b)
        draw.text((cx + 12 * S, fy + 24 * S), fs, fill=(123, 131, 142, 255), font=font_tag_r)

    rx = lx + 556 * S
    draw.line((lx, 524 * S, rx, 524 * S), fill=(255, 255, 255, 20), width=S)
    draw.rounded_rectangle((lx + 3 * S, 556 * S, lx + 16 * S, 566 * S), radius=2 * S, outline=(77, 234, 196, 255), width=2 * S)
    draw.arc((lx + 6 * S, 550 * S, lx + 13 * S, 558 * S), 180, 360, fill=(77, 234, 196, 255), width=2 * S)
    draw.text((lx + 24 * S, 550 * S), spec['footer_note'], fill=(179, 185, 194, 255), font=font_footer_note)
    ub = draw.textbbox((0, 0), spec['footer_url'], font=font_footer_url)
    draw.text((rx - (ub[2] - ub[0]), 550 * S), spec['footer_url'], fill=(77, 234, 196, 255), font=font_footer_url)

    # Right 3D PostureScene Panel
    pw, ph, px, py = 488 * S, 546 * S, 656 * S, 42 * S
    scene_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'posture-scene-base.png')
    cropped = Image.open(scene_path).convert('RGBA').crop((28, 18, 595, 610)).resize((pw, ph), Image.Resampling.LANCZOS)
    mask = Image.new('L', (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw - 1, ph - 1), radius=24 * S, fill=255)
    img.paste(cropped, (px, py), mask)

    d_pre, d_st, d_ideal, l_title, l_ratio = spec['demo']
    pb, sb = draw.textbbox((0, 0), d_pre, font=font_tag_r), draw.textbbox((0, 0), d_st, font=font_tag_b)
    draw.rounded_rectangle((px + 18 * S, py + 18 * S, px + 52 * S + (pb[2] - pb[0]) + (sb[2] - sb[0]), py + 48 * S), radius=15 * S, fill=(11, 13, 16, 210), outline=(255, 255, 255, 28), width=S)
    draw.text((px + 31 * S, py + 26 * S), d_pre, fill=(123, 131, 142, 255), font=font_tag_r)
    draw.text((px + 39 * S + (pb[2] - pb[0]), py + 25 * S), d_st, fill=(255, 190, 92, 255), font=font_tag_b)

    ib = draw.textbbox((0, 0), d_ideal, font=font_tag_r)
    draw.text((px + 191 * S - (ib[2] - ib[0]), py + 68 * S), d_ideal, fill=(77, 234, 196, 255), font=font_tag_r)
    draw.rounded_rectangle((px + 212 * S, py + 108 * S, px + 263 * S, py + 128 * S), radius=6 * S, fill=(255, 190, 92, 255))
    draw.text((px + 218 * S, py + 112 * S), "+3.2 cm", fill=(26, 19, 6, 255), font=load_font(latin_bold, 10 * S, 1))

    f_lt, f_lk = load_font(spec['font_reg'], 11 * S, reg_idx), load_font(latin_bold, 19 * S, 1)
    bt, br = draw.textbbox((0, 0), l_title, font=f_lt), draw.textbbox((0, 0), l_ratio, font=f_lt)
    cw = max(bt[2] - bt[0], br[2] - br[0], 54 * S) + 24 * S
    cx, cy = px + 281 * S, py + 39 * S
    draw.rounded_rectangle((cx, cy, cx + cw, cy + 66 * S), radius=10 * S, fill=(11, 13, 16, 230), outline=(255, 255, 255, 32), width=S)
    draw.text((cx + 12 * S, cy + 8 * S), l_title, fill=(179, 185, 194, 220), font=f_lt)
    draw.text((cx + 12 * S, cy + 23 * S), "22 kg", fill=(255, 107, 91, 255), font=f_lk)
    draw.text((cx + 12 * S, cy + 47 * S), l_ratio, fill=(179, 185, 194, 200), font=f_lt)
    draw.rounded_rectangle((px, py, px + pw - 1, py + ph - 1), radius=24 * S, outline=(255, 255, 255, 24), width=S)

    final_rgb = img.resize((1200, 630), Image.Resampling.LANCZOS).convert("RGB")
    final_rgb.save(spec['out'], "PNG", optimize=True)
    print(f"Saved OGP card ({locale}): {spec['out']} (1200x630)")
    if locale == 'en':
        for alias in ('public/twitter-image.png', 'public/opengraph-image.png'):
            final_rgb.save(alias, "PNG", optimize=True)
            print(f"Saved legacy OGP alias: {alias} (1200x630)")


if __name__ == "__main__":
    squircle = extract_perfect_squircle()
    for loc, spec in OGP_SPECS.items():
        generate_social_ogp_for_locale(squircle, loc, spec)
    print("\nAll localized OGP assets generated successfully!")
