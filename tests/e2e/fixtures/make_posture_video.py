"""MediaPipe のサンプル写真から、頭部だけを拡大・下降させた「首猫背」区間を含む連番画像を作る。"""
import sys, os
from PIL import Image, ImageDraw, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
src = Image.open(os.path.join(D, 'portrait.jpg')).convert('RGB')
W, H = 640, 480
base = src.crop((0, 0, 820, 615)).resize((W, H), Image.LANCZOS)
sx = W / 820
# 頭部（首より上）の領域
hx0, hy0, hx1, hy1 = [int(v * sx) for v in (255, 0, 545, 330)]
head = base.crop((hx0, hy0, hx1, hy1))
mask = Image.new('L', head.size, 0)
ImageDraw.Draw(mask).ellipse((8, 8, head.size[0] - 8, head.size[1] - 8), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(10))

def bad(scale, drop):
    im = base.copy()
    hw, hh = int(head.size[0] * scale), int(head.size[1] * scale)
    h2 = head.resize((hw, hh), Image.LANCZOS)
    m2 = mask.resize((hw, hh), Image.LANCZOS)
    cx = (hx0 + hx1) // 2
    cy = (hy0 + hy1) // 2 + int(drop * H)
    im.paste(h2, (cx - hw // 2, cy - hh // 2), m2)
    return im

fps = 15
segments = [(base, 45), (bad(1.13, 0.05), 30), (base, 25)]
out = os.path.join(D, 'frames'); os.makedirs(out, exist_ok=True)
i = 0
for im, secs in segments:
    for _ in range(secs * fps):
        im.save(os.path.join(out, f'{i:05d}.jpg'), quality=88)
        i += 1
print(i, 'frames')
