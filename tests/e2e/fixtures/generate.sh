#!/usr/bin/env bash
# E2E 用の偽カメラ映像を生成する（要: python3 + Pillow, ffmpeg, ネットワーク）。
# MediaPipe 公開サンプルの正面ポートレートから「基準姿勢 → 頭が前下方へ → 基準姿勢」の映像を作る。
#   posture.mjpeg … Playwright の --use-file-for-fake-video-capture 用
#   public/dev/posture.mp4 … 開発サーバーで /?source=/dev/posture.mp4 として使う
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../../.." && pwd)"
curl -sfL -o "$DIR/portrait.jpg" https://storage.googleapis.com/mediapipe-assets/portrait.jpg
python3 "$DIR/make_posture_video.py"
ffmpeg -loglevel error -y -framerate 15 -i "$DIR/frames/%05d.jpg" -c:v mjpeg -q:v 4 "$DIR/posture.mjpeg"
mkdir -p "$ROOT/public/dev"
ffmpeg -loglevel error -y -framerate 15 -i "$DIR/frames/%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 23 "$ROOT/public/dev/posture.mp4"
rm -rf "$DIR/frames"
echo "generated: $DIR/posture.mjpeg, $ROOT/public/dev/posture.mp4"
