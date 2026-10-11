"""VRM（glTF バイナリ）のテクスチャを縮小・再圧縮して配信サイズを下げる。

python3 -I scripts/avatars/compress_vrm.py <入力.vrm> <出力.vrm> [最大辺px]

- 最大辺を超える画像を縮小する（既定 1024）
- 透過を使っていないカラー画像は JPEG にする（法線マップは PNG のまま）
- サムネイル画像は VRM のメタ情報ごと外す
VRM の拡張（MToon・SpringBone など）は JSON をそのまま保つ。
"""

import io
import json
import struct
import sys

from PIL import Image


def read_glb(path):
    data = open(path, 'rb').read()
    json_len = struct.unpack('<I', data[12:16])[0]
    gltf = json.loads(data[20 : 20 + json_len])
    bin_start = 20 + json_len + 8
    bin_len = struct.unpack('<I', data[20 + json_len : 24 + json_len])[0]
    return gltf, data[bin_start : bin_start + bin_len]


def write_glb(path, gltf, binary):
    js = json.dumps(gltf, ensure_ascii=False, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    binary += b'\0' * (-len(binary) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON'))
        f.write(js)
        f.write(struct.pack('<I4s', len(binary), b'BIN\0'))
        f.write(binary)


def recompress(raw, name, max_side):
    img = Image.open(io.BytesIO(raw))
    img.load()
    if max(img.size) > max_side:
        scale = max_side / max(img.size)
        img = img.resize(
            (max(1, round(img.width * scale)), max(1, round(img.height * scale))),
            Image.LANCZOS,
        )
    is_normal = name.endswith('_nml') or 'Normal' in name
    has_alpha = img.mode in ('RGBA', 'LA') and img.getchannel('A').getextrema()[0] < 255
    out = io.BytesIO()
    if not is_normal and not has_alpha and min(img.size) >= 64:
        img.convert('RGB').save(out, 'JPEG', quality=88, optimize=True)
        return out.getvalue(), 'image/jpeg'
    img.save(out, 'PNG', optimize=True)
    return out.getvalue(), 'image/png'


def main():
    src, dst = sys.argv[1], sys.argv[2]
    max_side = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
    gltf, binary = read_glb(src)

    # サムネイルは表示に使わないので参照ごと外す
    meta = gltf.get('extensions', {}).get('VRM', {}).get('meta', {})
    thumb = meta.pop('texture', None)
    if thumb is not None and thumb >= 0:
        thumb_image = gltf['textures'][thumb]['source']
        gltf['images'][thumb_image]['_drop'] = True

    replaced = {}
    for image in gltf['images']:
        bv = gltf['bufferViews'][image['bufferView']]
        raw = binary[bv.get('byteOffset', 0) : bv.get('byteOffset', 0) + bv['byteLength']]
        if image.pop('_drop', False):
            # 1x1 の透明 PNG に置き換え、テクスチャの添字は保つ
            buf = io.BytesIO()
            Image.new('RGBA', (1, 1)).save(buf, 'PNG')
            replaced[image['bufferView']] = buf.getvalue()
            image['mimeType'] = 'image/png'
            continue
        data, mime = recompress(raw, image.get('name', ''), max_side)
        replaced[image['bufferView']] = data
        image['mimeType'] = mime

    # bufferView を詰め直す
    out = bytearray()
    for i, bv in enumerate(gltf['bufferViews']):
        start = bv.get('byteOffset', 0)
        chunk = replaced.get(i, binary[start : start + bv['byteLength']])
        out += b'\0' * (-len(out) % 4)
        bv['byteOffset'] = len(out)
        bv['byteLength'] = len(chunk)
        out += chunk
    gltf['buffers'][0]['byteLength'] = len(out)
    write_glb(dst, gltf, bytes(out))
    print(f'{src} -> {dst}: {len(binary) / 1e6:.1f}MB -> {len(out) / 1e6:.1f}MB')


if __name__ == '__main__':
    main()
