#!/usr/bin/env python3
"""
Generate complete asset suite for SitRight based on 10C Master Visual:
- High-res cropped transparent squircle
- Multi-resolution App / PWA icons (512, 192, 72)
- Maskable PWA icon (512 with safe padding)
- Apple Touch Icon (180x180)
- Favicon (.ico multi-resolution)
- High-fidelity Social OGP / Twitter Card (1200x630)
"""
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def extract_perfect_squircle():
    """Extract the titanium squircle precisely with ultra-smooth antialiasing."""
    src = Image.open('.tmp/design-proposals/bone-variant-10c-modular-shear.png').convert('RGBA')
    
    # Precise bounding box of titanium plate in 1024x1024 master
    # Box: x: 199 to 825 (w=626), y: 196 to 822 (h=626)
    box_x0, box_y0 = 199, 196
    size = 626
    
    plate = src.crop((box_x0, box_y0, box_x0 + size, box_y0 + size))
    
    # 4x super-sampled mask
    scale = 4
    mask_size = size * scale
    mask_hi = Image.new('L', (mask_size, mask_size), 0)
    draw = ImageDraw.Draw(mask_hi)
    
    # Corner radius in super-sampled space:
    # Top-left corner diagonal hits at (237 - 199) = 38px in plate space -> ~148px radius
    radius = int(148 * scale)
    draw.rounded_rectangle((0, 0, mask_size, mask_size), radius=radius, fill=255)
    
    mask = mask_hi.resize((size, size), Image.Resampling.LANCZOS)
    plate.putalpha(mask)
    
    plate_path = '.tmp/design-proposals/bone-10c-perfect-squircle.png'
    plate.save(plate_path)
    print(f"Extracted perfect squircle: {plate_path} ({size}x{size})")
    return plate

def generate_app_and_pwa_icons(squircle):
    """Generate multi-resolution PWA & browser icons."""
    os.makedirs('public', exist_ok=True)
    
    # 1. Standard transparent icons
    sizes = [
        (512, 'public/icon-512x512.png'),
        (192, 'public/icon-192x192.png'),
        (72,  'public/icon-72x72.png'),
    ]
    for s, path in sizes:
        resized = squircle.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(path, 'PNG', optimize=True)
        print(f"Saved: {path} ({s}x{s})")

    # 2. Apple Touch Icon (180x180):
    # iOS adds its own corner radius, so a solid background or very slight padding is best
    apple_icon = Image.new('RGBA', (180, 180), (11, 13, 16, 255))
    apple_squircle = squircle.resize((172, 172), Image.Resampling.LANCZOS)
    apple_icon.paste(apple_squircle, (4, 4), apple_squircle)
    apple_icon.convert('RGB').save('public/apple-touch-icon.png', 'PNG', optimize=True)
    print("Saved: public/apple-touch-icon.png (180x180)")

    # 3. Maskable PWA Icon (512x512):
    # Android Adaptive Icon requires icon content to be inside 80% safe zone (diameter 409.6px)
    maskable = Image.new('RGBA', (512, 512), (11, 13, 16, 255))
    content_size = 400
    m_squircle = squircle.resize((content_size, content_size), Image.Resampling.LANCZOS)
    offset = (512 - content_size) // 2
    maskable.paste(m_squircle, (offset, offset), m_squircle)
    maskable.save('public/icon-maskable-512x512.png', 'PNG', optimize=True)
    print("Saved: public/icon-maskable-512x512.png (512x512 with safe zone)")

    # 4. Favicon.ico (multi-resolution 16, 32, 48, 64)
    ico_sizes = [(64, 64), (48, 48), (32, 32), (16, 16)]
    ico_images = [squircle.resize(sz, Image.Resampling.LANCZOS) for sz in ico_sizes]
    ico_images[0].save('public/favicon.ico', format='ICO', sizes=ico_sizes)
    print("Saved: public/favicon.ico (multi-size ICO)")

def generate_social_ogp(squircle):
    """Generate 1200x630 OGP card for SNS (Twitter/X, Facebook, Slack, LINE, Discord)."""
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), (11, 13, 16, 255)) # #0b0d10 dark titanium

    # 1. Background radial ambient glow
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Warm amber glow behind icon (center around x=310, y=315)
    center_x, center_y = 310, 315
    for r in range(340, 0, -4):
        alpha = int(55 * (1 - r / 340) ** 1.6)
        glow_draw.ellipse(
            (center_x - r, center_y - r, center_x + r, center_y + r),
            fill=(255, 95, 0, alpha)
        )
        
    # Cool subtle titanium glow on top right
    for r in range(450, 0, -10):
        alpha = int(20 * (1 - r / 450) ** 2)
        glow_draw.ellipse(
            (1020 - r, 100 - r, 1020 + r, 100 + r),
            fill=(30, 80, 160, alpha)
        )

    img = Image.alpha_composite(img, glow)

    # 2. Subtle architectural grid lines
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    for x in range(0, W, 40):
        grid_draw.line((x, 0, x, H), fill=(255, 255, 255, 4))
    for y in range(0, H, 40):
        grid_draw.line((0, y, W, y), fill=(255, 255, 255, 4))
    img = Image.alpha_composite(img, grid)

    # 3. Position the Squircle Icon (420x420)
    icon_size = 420
    icon_resized = squircle.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    
    icon_x = 95
    icon_y = 105
    
    # High-quality drop shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_offset = 16
    corner_radius = int(icon_size * 0.236)
    shadow_draw.rounded_rectangle(
        (icon_x, icon_y + shadow_offset, icon_x + icon_size, icon_y + icon_size + shadow_offset),
        radius=corner_radius,
        fill=(0, 0, 0, 180)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=26))
    img = Image.alpha_composite(img, shadow)

    # Paste squircle icon
    img.paste(icon_resized, (icon_x, icon_y), icon_resized)

    # 4. Typography and Copy
    draw = ImageDraw.Draw(img)
    
    font_bold_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    font_regular_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    if not os.path.exists(font_bold_path):
        font_bold_path = "/System/Library/Fonts/Helvetica.ttc"
        font_regular_path = "/System/Library/Fonts/Helvetica.ttc"

    font_badge = ImageFont.truetype(font_bold_path, 15)
    font_title = ImageFont.truetype(font_bold_path, 80)
    font_domain = ImageFont.truetype(font_bold_path, 44)
    font_sub = ImageFont.truetype(font_regular_path, 27)
    font_tag = ImageFont.truetype(font_bold_path, 15)

    text_x = 565
    
    # 4.1 Pill Badge: "● REAL-TIME WEBCAM ERGONOMICS"
    badge_y = 114
    badge_w = 340
    badge_h = 32
    pill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pill_draw = ImageDraw.Draw(pill)
    pill_draw.rounded_rectangle(
        (text_x, badge_y, text_x + badge_w, badge_y + badge_h),
        radius=16,
        fill=(22, 28, 40, 220),
        outline=(48, 64, 94, 255),
        width=1
    )
    img = Image.alpha_composite(img, pill)
    draw = ImageDraw.Draw(img)
    # Status indicator dot
    draw.ellipse((text_x + 14, badge_y + 11, text_x + 24, badge_y + 21), fill=(255, 149, 0, 255))
    draw.text((text_x + 32, badge_y + 7), "REAL-TIME WEBCAM ERGONOMICS", fill=(226, 232, 240, 255), font=font_badge)

    # 4.2 Brand Name: "SitRight.me"
    title_y = 170
    draw.text((text_x, title_y), "SitRight", fill=(255, 255, 255, 255), font=font_title)
    
    sitright_bbox = draw.textbbox((text_x, title_y), "SitRight", font=font_title)
    dot_me_x = sitright_bbox[2] + 4
    draw.text((dot_me_x, title_y + 30), ".me", fill=(255, 149, 0, 255), font=font_domain)

    # 4.3 Subtitle Copy
    sub_y = 282
    sub_line1 = "Instant 3D biomechanical posture tracking."
    sub_line2 = "Alerts you only when slouching persists."
    draw.text((text_x, sub_y), sub_line1, fill=(203, 213, 225, 255), font=font_sub)
    draw.text((text_x, sub_y + 36), sub_line2, fill=(148, 163, 184, 255), font=font_sub)

    # 4.4 Feature Pills with dynamic padding
    tags_y = 390
    tags = [
        ("IN-BROWSER PRIVACY", (56, 189, 248)),   # Cyan accent
        ("ZERO INSTALL", (255, 149, 0)),          # Amber accent
        ("3D BIOMECHANICS", (74, 222, 128))       # Emerald accent
    ]
    
    font_tag = ImageFont.truetype(font_bold_path, 13)
    cur_tag_x = text_x
    for label, dot_color in tags:
        bbox = draw.textbbox((0, 0), label, font=font_tag)
        text_w = bbox[2] - bbox[0]
        tag_w = text_w + 44
        
        tag_pill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        tag_pill_draw = ImageDraw.Draw(tag_pill)
        tag_pill_draw.rounded_rectangle(
            (cur_tag_x, tags_y, cur_tag_x + tag_w, tags_y + 34),
            radius=17,
            fill=(18, 22, 30, 220),
            outline=(40, 48, 64, 255),
            width=1
        )
        img = Image.alpha_composite(img, tag_pill)
        draw = ImageDraw.Draw(img)
        # Small accent bullet
        draw.ellipse((cur_tag_x + 13, tags_y + 13, cur_tag_x + 21, tags_y + 21), fill=dot_color + (255,))
        draw.text((cur_tag_x + 27, tags_y + 9), label, fill=(226, 232, 240, 255), font=font_tag)
        cur_tag_x += tag_w + 12

    # 4.5 Bottom Callout / URL
    bottom_y = 472
    draw.line((text_x, bottom_y, W - 90, bottom_y), fill=(30, 38, 52, 255), width=1)
    
    font_footer_bold = ImageFont.truetype(font_bold_path, 18)
    font_footer_dim = ImageFont.truetype(font_regular_path, 18)
    draw.text((text_x, bottom_y + 18), "Open Source Ergo AI", fill=(148, 163, 184, 255), font=font_footer_bold)
    draw.text((text_x + 190, bottom_y + 18), "—", fill=(71, 85, 105, 255), font=font_footer_dim)
    draw.text((text_x + 215, bottom_y + 18), "https://sitright.me", fill=(255, 149, 0, 255), font=font_footer_bold)

    # 5. Save in all required standard paths
    final_rgb = img.convert("RGB")
    final_rgb.save("public/og-image.png", "PNG", quality=95)
    final_rgb.save("src/app/opengraph-image.png", "PNG", quality=95)
    final_rgb.save("src/app/twitter-image.png", "PNG", quality=95)
    final_rgb.save("/Users/a13973/.gemini/antigravity-cli/brain/5b9ef652-0223-4651-82d1-20293e3c7cbc/images/og-image-10c.png", "PNG", quality=95)
    print("Saved OGP cards to public/ and src/app/!")

if __name__ == "__main__":
    squircle = extract_perfect_squircle()
    generate_app_and_pwa_icons(squircle)
    generate_social_ogp(squircle)
    print("\nAll assets generated successfully!")
