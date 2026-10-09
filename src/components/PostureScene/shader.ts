/**
 * 横向きの人体（マネキン）と背骨をレイマーチングで描くフラグメントシェーダー。
 * 単位は cm。x: 前, y: 上, z: 体の右（カメラ側）。人体は左右対称なので多くの部位で abs(z) を使う。
 */
export const VERTEX_SHADER = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uFocal;

uniform vec3 uTorso[5];
uniform vec2 uC7;
uniform vec2 uNeckBase;
uniform vec2 uPivot;
uniform float uHeadAngle;
uniform vec2 uAcromion;
uniform vec2 uElbow;
uniform vec2 uWrist;
uniform vec4 uVert[24];
uniform float uLean;     // 上体の側屈（ラジアン, 体の右 = +z へ倒れると正）
uniform float uHeadRoll; // 上体に対する頭の側屈（ラジアン）

uniform vec2 uGNeckBase;
uniform vec2 uGPivot;
uniform vec3 uGTorso;

uniform vec4 uSev;      // forward, down, slump, overall
uniform float uSevLean;
uniform float uXray;
uniform float uGhost;
uniform float uBreath;

#define MAT_SKIN 1.0
#define MAT_WOOD 2.0
#define MAT_METAL 3.0
#define MAT_SCREEN 4.0
#define MAT_FABRIC 5.0
// 6 以上は人体側の素材（X線表示・負担の色付けの対象）
#define MAT_CLOTH 6.0
#define MAT_HAIR 7.0
#define MAT_EYE 8.0
#define MAT_NOSE 9.0
#define MAT_JOINT 10.0
#define MAT_PANTS 11.0
#define MAT_INNER 12.0

// モデルの種類は MODEL_* の define で切り替える（未指定なら人体マネキン）
#if defined(MODEL_BUDDY) || defined(MODEL_CAT) || defined(MODEL_BEAR)
#define DRESSED
#endif
#if defined(MODEL_CAT) || defined(MODEL_BEAR)
#define ANIMAL
#endif
#ifndef HEAD_SCALE
#define HEAD_SCALE 1.0
#endif
#ifdef DRESSED
#define TOP_MAT MAT_CLOTH
#define BOTTOM_MAT MAT_PANTS
#else
#define TOP_MAT MAT_SKIN
#define BOTTOM_MAT MAT_SKIN
#endif

const float PI = 3.14159265;

// ---------- SDF primitives ----------
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }
// (距離, 素材) の合成。素材は近い方を採る
vec2 opU(vec2 a, vec2 b, float k) { return vec2(smin(a.x, b.x, k), a.x < b.x ? a.y : b.y); }
vec2 opMin(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
bool isBody(float mat) { return mat == MAT_SKIN || mat > 5.5; }

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}

float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a;
  float l2 = dot(ba, ba);
  float rr = r1 - r2;
  float a2 = l2 - rr * rr;
  float il2 = 1.0 / l2;
  vec3 pa = p - a;
  float y = dot(pa, ba);
  float z = y - l2;
  vec3 xv = pa * l2 - ba * y;
  float x2 = dot(xv, xv);
  float y2 = y * y * l2;
  float z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float sdRoundCyl(vec3 p, float ra, float h, float rb) {
  vec2 d = vec2(length(p.xz) - ra + rb, abs(p.y) - h + rb);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rb;
}

// 前傾 a（時計回り, x 前が正）の逆回転
vec2 unrot(vec2 v, float a) {
  float c = cos(a), s = sin(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}
vec2 rotf(vec2 v, float a) {
  float c = cos(a), s = sin(a);
  return vec2(v.x * c + v.y * s, -v.x * s + v.y * c);
}

// y-z 平面で、上方の点を +z へ a だけ倒す回転の逆
vec2 unrollYZ(vec2 v, float a) {
  float c = cos(a), s = sin(a);
  return vec2(v.x * c + v.y * s, -v.x * s + v.y * c);
}

// 上体の側屈: 骨盤（座面のすぐ上）を支点に、高さに応じて徐々に倒す（腰椎〜胸椎で分担して曲がる）
vec3 bend(vec3 p) {
  float a = uLean * smoothstep(14.0, 62.0, p.y);
  vec2 yz = unrollYZ(p.yz - vec2(12.0, 0.0), a);
  return vec3(p.x, yz.x + 12.0, yz.y);
}

// ---------- body ----------
// 頭の局所座標（x: 顔の前, y: 頭頂, z: 右耳）。HEAD_SCALE 分だけ縮めた空間で形を定義する
vec3 headLocal(vec3 p, vec2 pivot, float ang, float roll) {
  vec3 h = vec3(unrot(p.xy - pivot, ang), p.z);
  h.yz = unrollYZ(h.yz, roll);
  return h / HEAD_SCALE;
}

#if defined(MODEL_CLAY)
// 顔の造作を持たない、つるりとした陶土の頭
vec2 headShape(vec3 h, vec3 hq) {
  float d = sdEllipsoid(h - vec3(1.8, 6.6, 0.0), vec3(10.1, 9.3, 7.7));
  d = smin(d, sdEllipsoid(h - vec3(6.4, -1.2, 0.0), vec3(6.5, 7.0, 5.3)), 3.2);
  d = smin(d, sdEllipsoid(h - vec3(10.0, -6.0, 0.0), vec3(2.8, 2.4, 2.8)), 2.6);
  d = smin(d, sdEllipsoid(hq - vec3(3.6, -4.2, 4.6), vec3(2.6, 2.4, 1.6)), 2.6);
  // 向きが分かる程度の鼻筋だけ残す
  d = smin(d, sdEllipsoid(h - vec3(12.0, 1.4, 0.0), vec3(1.5, 2.6, 1.4)), 2.0);
  vec3 e = hq - vec3(0.9, 2.0, 7.2);
  e.xy = unrot(e.xy, -0.22);
  d = smin(d, sdEllipsoid(e, vec3(1.3, 2.7, 0.9)), 1.0);
  return vec2(d, MAT_SKIN);
}
#elif defined(MODEL_WOOD)
// デッサン人形の卵形の頭
vec2 headShape(vec3 h, vec3 hq) {
  float d = sdEllipsoid(h - vec3(1.8, 6.4, 0.0), vec3(9.6, 9.2, 7.4));
  d = smin(d, sdEllipsoid(h - vec3(6.6, -1.6, 0.0), vec3(5.6, 6.6, 4.8)), 4.5);
  return vec2(d, MAT_SKIN);
}
#elif defined(MODEL_BUDDY)
// 丸い頭と黒目、短い髪のキャラクター
vec2 headShape(vec3 h, vec3 hq) {
  float d = sdEllipsoid(h - vec3(2.2, 6.2, 0.0), vec3(9.8, 9.6, 8.4));
  // 丸い頬と小さなあご
  d = smin(d, sdEllipsoid(h - vec3(6.6, 0.6, 0.0), vec3(6.0, 6.6, 6.6)), 4.0);
  d = smin(d, sdEllipsoid(h - vec3(9.0, -4.0, 0.0), vec3(2.4, 2.0, 3.0)), 2.6);
  d = smin(d, sdEllipsoid(h - vec3(12.9, 1.4, 0.0), vec3(1.1, 1.0, 1.2)), 1.0);
  // ほほえむ口元
  d = smax(d, -sdCapsule(hq, vec3(12.5, -1.9, 0.0), vec3(11.7, -1.4, 1.7), 0.22), 0.3);
  d = smin(d, sdEllipsoid(hq - vec3(1.4, 2.2, 8.1), vec3(1.4, 2.4, 1.0)), 1.0);
  vec2 res = vec2(d, MAT_SKIN);
  res = opMin(res, vec2(sdEllipsoid(hq - vec3(11.7, 3.2, 3.3), vec3(0.8, 1.25, 0.8)), MAT_EYE));
  // 生え際は前ほど高く、えり足は低く、耳の上は覆う
  float hair = sdEllipsoid(h - vec3(1.4, 7.0, 0.0), vec3(10.8, 9.9, 9.1));
  hair = smax(hair, (1.6 + 0.55 * h.x) - h.y, 1.8);
  // つむじから放射状に流れる毛束の溝
  float phi = atan(h.z, h.x - 1.0);
  hair += 0.09 * sin(phi * 22.0 + 0.35 * h.y) * smoothstep(2.0, 6.0, h.y);
  // 前髪の房
  hair = smin(hair, sdEllipsoid(h - vec3(10.4, 8.8, 0.0), vec3(2.4, 2.8, 2.8)), 1.2);
  hair = smin(hair, sdEllipsoid(hq - vec3(9.6, 8.4, 3.8), vec3(2.4, 2.6, 2.4)), 1.2);
  hair = smin(hair, sdEllipsoid(hq - vec3(7.4, 7.6, 6.6), vec3(2.6, 2.6, 2.0)), 1.2);
  return opU(res, vec2(hair, MAT_HAIR), 0.5);
}
#elif defined(MODEL_CAT)
// 三角の耳、ひげ袋、大きな目のネコ
vec2 headShape(vec3 h, vec3 hq) {
  float d = sdEllipsoid(h - vec3(1.8, 6.2, 0.0), vec3(9.0, 8.4, 8.6));
  d = smin(d, sdEllipsoid(hq - vec3(5.4, 0.6, 3.6), vec3(5.4, 5.0, 4.4)), 3.5);
  d = smin(d, sdEllipsoid(h - vec3(9.4, 2.8, 0.0), vec3(3.0, 2.6, 2.6)), 2.4);
  d = smin(d, sdEllipsoid(hq - vec3(11.0, -0.4, 1.6), vec3(2.2, 2.0, 2.1)), 1.4);
  d = smin(d, sdEllipsoid(h - vec3(10.0, -2.9, 0.0), vec3(1.8, 1.4, 1.6)), 1.2);
  vec2 res = vec2(d, MAT_SKIN);
  // 耳: 前後に薄い円錐を外側へ傾ける
  vec3 ea = hq - vec3(0.6, 11.6, 4.4);
  ea.yz = unrollYZ(ea.yz, 0.38);
  vec3 eb = vec3(ea.x * 2.2, ea.yz);
  float ear = sdRoundCone(eb, vec3(0.0), vec3(0.0, 7.0, 0.0), 3.8, 0.35) / 2.2;
  float inner = sdRoundCone(eb - vec3(2.2, 0.9, 0.0), vec3(0.0), vec3(0.0, 5.6, 0.0), 2.7, 0.2) / 2.2;
  ear = smax(ear, -inner, 0.25);
  res = opU(res, vec2(ear, inner < 0.35 ? MAT_INNER : MAT_SKIN), 1.4);
  res = opMin(res, vec2(sdEllipsoid(hq - vec3(9.8, 3.9, 3.9), vec3(1.45, 1.55, 1.4)), MAT_EYE));
  res = opU(res, vec2(sdEllipsoid(h - vec3(12.9, 0.9, 0.0), vec3(0.8, 0.7, 1.0)), MAT_NOSE), 0.4);
  return res;
}
#elif defined(MODEL_BEAR)
// 丸い耳と突き出た鼻づらのクマ
vec2 headShape(vec3 h, vec3 hq) {
  float d = sdEllipsoid(h - vec3(1.6, 6.0, 0.0), vec3(9.6, 9.0, 9.0));
  d = smin(d, sdEllipsoid(hq - vec3(4.8, 0.2, 3.8), vec3(5.6, 5.6, 4.8)), 3.5);
  d = smin(d, sdEllipsoid(h - vec3(10.4, -0.6, 0.0), vec3(4.4, 3.4, 3.8)), 2.2);
  vec2 res = vec2(d, MAT_SKIN);
  vec3 ea = hq - vec3(0.2, 12.8, 6.2);
  ea.yz = unrollYZ(ea.yz, 0.3);
  float ear = sdEllipsoid(ea, vec3(1.7, 3.2, 3.2));
  float inner = sdEllipsoid(ea - vec3(1.3, 0.1, 0.0), vec3(0.9, 2.2, 2.2));
  ear = smax(ear, -inner, 0.5);
  res = opU(res, vec2(ear, inner < 0.4 ? MAT_INNER : MAT_SKIN), 1.4);
  res = opMin(res, vec2(length(hq - vec3(10.5, 4.2, 3.8)) - 0.8, MAT_EYE));
  res = opU(res, vec2(sdEllipsoid(h - vec3(14.4, 1.0, 0.0), vec3(1.3, 1.0, 1.7)), MAT_NOSE), 0.5);
  return res;
}
#else
// 解剖学的な人体マネキン
vec2 headShape(vec3 h, vec3 hq) {
  float d = sdEllipsoid(h - vec3(1.8, 6.6, 0.0), vec3(10.1, 9.3, 7.7));
  d = smin(d, sdEllipsoid(h - vec3(6.4, -1.2, 0.0), vec3(6.5, 7.0, 5.3)), 3.2);
  // 顎と下顎角
  d = smin(d, sdEllipsoid(h - vec3(10.4, -6.4, 0.0), vec3(2.7, 2.2, 2.6)), 2.2);
  d = smin(d, sdEllipsoid(hq - vec3(3.6, -4.2, 4.6), vec3(2.6, 2.4, 1.6)), 2.6);
  // 頬骨・眉弓
  d = smin(d, sdEllipsoid(hq - vec3(9.0, 1.6, 4.3), vec3(2.5, 1.8, 1.9)), 1.6);
  d = smin(d, sdEllipsoid(hq - vec3(11.2, 4.5, 2.7), vec3(1.5, 1.1, 2.5)), 1.4);
  // 眼窩
  d = smax(d, -(length(hq - vec3(12.7, 2.7, 3.0)) - 1.45), 1.1);
  d = smin(d, length(hq - vec3(11.85, 2.7, 3.0)) - 1.05, 0.25);
  // 鼻
  d = smin(d, sdRoundCone(h, vec3(12.4, 3.6, 0.0), vec3(14.5, -0.1, 0.0), 0.7, 1.2), 1.1);
  d = smin(d, sdEllipsoid(hq - vec3(13.3, -0.4, 1.1), vec3(0.9, 0.8, 0.9)), 0.8);
  // 唇
  d = smin(d, sdEllipsoid(h - vec3(12.3, -2.7, 0.0), vec3(1.0, 0.7, 2.3)), 1.0);
  d = smin(d, sdEllipsoid(h - vec3(12.0, -4.0, 0.0), vec3(0.9, 0.65, 2.0)), 1.0);
  // 耳
  vec3 e = hq - vec3(0.9, 2.0, 7.25);
  e.xy = unrot(e.xy, -0.22);
  float ear = sdEllipsoid(e, vec3(1.45, 3.0, 0.95));
  ear = smax(ear, -sdEllipsoid(e - vec3(0.25, 0.1, 0.9), vec3(0.9, 2.1, 0.7)), 0.4);
  d = smin(d, ear, 0.7);
  return vec2(d, MAT_SKIN);
}
#endif

vec2 sdHeadM(vec3 p, vec2 pivot, float ang, float roll) {
  vec3 h = headLocal(p, pivot, ang, roll);
  float bound = length(h - vec3(3.5, 5.0, 0.0)) - 18.0;
  if (bound > 5.0) return vec2(bound * HEAD_SCALE, MAT_SKIN);
  vec2 r = headShape(h, vec3(h.xy, abs(h.z)));
  return vec2(r.x * HEAD_SCALE, r.y);
}

float sdHead(vec3 p, vec2 pivot, float ang, float roll) {
  return sdHeadM(p, pivot, ang, roll).x;
}

float sdNeck(vec3 p, vec2 base, vec2 pivot, float ang) {
  vec2 top = pivot + rotf(vec2(1.6, 0.4), ang);
#ifdef MODEL_WOOD
  return sdCapsule(p, vec3(base, 0.0), vec3(top, 0.0), 3.4);
#else
  return sdRoundCone(p, vec3(base, 0.0), vec3(top, 0.0), 6.0, 5.0);
#endif
}

float torsoPart(vec3 p, vec3 t, vec3 r) {
  return sdEllipsoid(vec3(unrot(p.xy - t.xy, t.z), p.z), r);
}

// 胴体全体を包むカプセル。ブレンド半径（最大 7cm）より外側でのみ打ち切り、継ぎ目を出さない
float torsoBound(vec3 p) {
  return sdCapsule(p, vec3(uTorso[0].xy, 0.0), vec3(uTorso[4].xy, 0.0), 21.0);
}

vec2 sdTorsoM(vec3 p) {
  float bound = torsoBound(p);
  if (bound > 10.0) return vec2(bound, TOP_MAT);
  float breath = 1.0 + 0.012 * uBreath;
#ifdef MODEL_WOOD
  // 骨盤・腹・胸の3つのブロックを継ぎ目が見えるように重ねる
  float pelvis = torsoPart(p, uTorso[0], vec3(11.4, 9.8, 15.6));
  float belly = torsoPart(p, uTorso[1], vec3(8.6, 8.6, 12.4));
  float chest = smin(torsoPart(p, uTorso[2], vec3(10.0 * breath, 9.0, 14.0)), torsoPart(p, uTorso[3], vec3(11.0 * breath, 9.8, 15.4 * breath)), 6.0);
  chest = smin(chest, torsoPart(p, uTorso[4], vec3(8.6, 7.4, 15.2)), 5.0);
  return vec2(min(min(pelvis, belly), chest), MAT_SKIN);
#else
  vec2 d = vec2(torsoPart(p, uTorso[0], vec3(12.0, 10.5, 17.0)), BOTTOM_MAT);
  d = opU(d, vec2(torsoPart(p, uTorso[1], vec3(9.6, 9.0, 14.0)), TOP_MAT), 7.0);
  d = opU(d, vec2(torsoPart(p, uTorso[2], vec3(11.0 * breath, 9.5, 15.2)), TOP_MAT), 7.0);
  d = opU(d, vec2(torsoPart(p, uTorso[3], vec3(11.6 * breath, 10.0, 16.0 * breath)), TOP_MAT), 7.0);
  d = opU(d, vec2(torsoPart(p, uTorso[4], vec3(9.0, 7.5, 15.5)), TOP_MAT), 7.0);
  return d;
#endif
}

float sdTorso(vec3 p) { return sdTorsoM(p).x; }

#ifdef MODEL_WOOD
// デッサン人形: 部位を硬く組み合わせ、関節は球にする
vec2 sdBodyM(vec3 p) {
  p = bend(p);
  vec3 q = vec3(p.xy, abs(p.z));
  vec2 res = sdTorsoM(p);
  vec3 shJ = vec3(uAcromion + vec2(0.2, -3.5), 17.4);
  vec3 el = vec3(uElbow, 19.5);
  vec3 wr = vec3(uWrist, 15.5);
  vec3 knee = vec3(44.5, 9.5, 10.0);
  float joints = length(q - shJ) - 4.6;
  joints = min(joints, length(q - el) - 3.2);
  joints = min(joints, length(q - wr) - 2.1);
  joints = min(joints, length(q - knee) - 5.2);
  joints = min(joints, length(p - vec3(uNeckBase, 0.0)) - 4.0);
  float limbs = sdRoundCone(q, shJ, el, 3.9, 3.1);
  limbs = min(limbs, sdRoundCone(q, el, wr, 3.0, 2.2));
  // 手はミトン形
  vec3 hp = q - (wr + vec3(4.4, 0.1, -0.6));
  hp.xz = unrot(hp.xz, 0.12);
  float hand = sdEllipsoid(hp, vec3(4.6, 1.5, 3.4));
  hand = smin(hand, sdRoundCone(hp, vec3(0.2, -0.3, 2.4), vec3(4.0, -1.0, 3.6), 1.1, 0.8), 1.0);
  limbs = min(limbs, hand);
  limbs = min(limbs, sdRoundCone(q, vec3(2.0, 9.5, 9.0), knee, 7.6, 5.4));
  limbs = min(limbs, sdRoundCone(q, knee, vec3(47.0, -36.0, 10.5), 4.8, 3.2));
  limbs = min(limbs, sdNeck(p, uNeckBase, uPivot, uHeadAngle));
  res = opMin(res, vec2(limbs, MAT_SKIN));
  res = opMin(res, sdHeadM(p, uPivot, uHeadAngle, uHeadRoll));
  res = opMin(res, vec2(joints, MAT_JOINT));
  return res;
}
#else
vec2 sdBodyM(vec3 p) {
  p = bend(p);
  vec3 q = vec3(p.xy, abs(p.z));
  vec2 res = sdTorsoM(p);
  // 僧帽筋と三角筋
  vec3 trap = vec3(uNeckBase + vec2(-1.2, 2.2), 3.5);
  vec3 sh = vec3(uAcromion, 16.8);
  res = opU(res, vec2(sdRoundCone(q, trap, sh, 4.6, 4.0), TOP_MAT), 5.0);
  res = opU(res, vec2(sdEllipsoid(q - (sh + vec3(0.6, -3.0, 1.6)), vec3(5.5, 6.8, 4.9)), TOP_MAT), 3.0);
#ifdef DRESSED
  // パーカーのフード（首の後ろでたたまれている）
  vec3 hood = vec3(unrot(p.xy - (uNeckBase + vec2(-9.6, -2.4)), -0.45), p.z);
  float hoodD = sdEllipsoid(hood, vec3(3.6, 5.0, 8.2));
  // 縁を少しへこませて、たたまれた布の厚みを見せる
  hoodD = smax(hoodD, -sdEllipsoid(hood - vec3(1.2, 1.6, 0.0), vec3(2.0, 3.6, 6.4)), 0.8);
  res = opU(res, vec2(hoodD, MAT_CLOTH), 2.0);
#endif
  // 腕（デスク上の手まで）
  vec3 shJ = vec3(uAcromion + vec2(0.2, -3.5), 18.0);
  vec3 el = vec3(uElbow, 19.5);
  vec3 wr = vec3(uWrist, 15.5);
  float armBound = min(sdCapsule(q, shJ, el, 8.0), sdCapsule(q, el, wr + vec3(9.0, 0.0, 0.0), 8.0));
  vec2 arm = vec2(armBound, TOP_MAT);
  if (armBound < 5.0) {
    arm.x = smin(sdRoundCone(q, shJ, el, 4.6, 3.6), sdRoundCone(q, el, wr, 3.6, 2.5), 1.6);
#ifdef DRESSED
    // 袖口のリブ
    vec3 dir = normalize(wr - el);
    arm.x = smin(arm.x, sdRoundCone(q, wr - dir * 2.6, wr - dir * 0.4, 2.95, 2.85), 0.5);
#endif
    vec3 hp = q - (wr + vec3(4.2, 0.1, -0.6));
    hp.xz = unrot(hp.xz, 0.12);
#ifdef ANIMAL
    // 丸い前足
    float hand = sdEllipsoid(hp - vec3(1.0, 0.0, 0.0), vec3(5.0, 1.9, 3.9));
    hand = smin(hand, sdEllipsoid(hp - vec3(5.2, -1.0, 0.0), vec3(2.4, 1.5, 3.5)), 1.6);
#else
    // 手: 甲・指（キーボードへ軽く曲げる）・親指
    float hand = sdEllipsoid(hp, vec3(4.2, 1.45, 3.9));
    hand = smin(hand, sdRoundCone(hp, vec3(3.0, 0.0, 0.0), vec3(7.4, -0.9, 0.0), 1.15, 0.95), 1.4);
    hand = smin(hand, sdRoundCone(hp, vec3(7.2, -0.8, 0.0), vec3(9.0, -2.2, 0.0), 0.95, 0.8), 0.6);
    hand = smax(hand, -sdRoundBox(vec3(hp.x - 7.5, hp.y, abs(fract(hp.z / 2.0 + 0.5) - 0.5) * 2.0), vec3(3.5, 3.0, 0.08), 0.06), 0.3);
    hand = smin(hand, sdRoundCone(hp, vec3(0.5, -0.4, 2.6), vec3(4.6, -1.2, 3.9), 1.1, 0.75), 1.0);
#endif
    arm = opU(arm, vec2(hand, MAT_SKIN), 1.4);
  }
  res = opU(res, arm, 2.0);
  // 首と頭
  res = opU(res, vec2(sdNeck(p, uNeckBase, uPivot, uHeadAngle), MAT_SKIN), 4.0);
  res = opU(res, sdHeadM(p, uPivot, uHeadAngle, uHeadRoll), 2.8);
  // 太もも（座面の上）とすね（膝から床へ）
  res = opU(res, vec2(sdRoundCone(q, vec3(0.0, 9.5, 9.0), vec3(44.0, 10.5, 10.0), 8.6, 6.0), BOTTOM_MAT), 6.0);
  res = opU(res, vec2(sdRoundCone(q, vec3(44.5, 9.5, 10.0), vec3(47.0, -36.0, 10.5), 5.6, 3.6), BOTTOM_MAT), 2.5);
#ifdef MODEL_CAT
  // しっぽ（スツールの後ろへ垂らす）
  float tail = sdRoundCone(p, vec3(-9.0, 10.0, 0.0), vec3(-19.0, 5.0, 4.0), 2.5, 2.2);
  tail = smin(tail, sdRoundCone(p, vec3(-19.0, 5.0, 4.0), vec3(-23.0, -14.0, 8.0), 2.2, 1.6), 1.5);
  res = opU(res, vec2(tail, MAT_SKIN), 1.0);
#endif
  return res;
}
#endif

float sdGhost(vec3 p) {
  float d = sdNeck(p, uGNeckBase, uGPivot, 0.0);
  d = smin(d, sdHead(p, uGPivot, 0.0, 0.0), 2.8);
  // 首の付け根より下は描かない（胴体と重なって輪郭が読みにくくなるため）
  return max(d, uGNeckBase.y + 1.0 - p.y);
}

// ---------- props ----------
vec2 sdProps(vec3 p) {
  // スツール（木の座面と金属の支柱）
  vec3 sp = p - vec3(6.0, -3.2, 0.0);
  float seat = sdRoundCyl(sp, 20.0, 3.4, 1.6);
  float pole = sdCapsule(p, vec3(6.0, -6.0, 0.0), vec3(6.0, -90.0, 0.0), 2.4);
  vec2 res = vec2(seat, MAT_FABRIC);
  if (pole < res.x) res = vec2(pole, MAT_METAL);
  // デスク天板
  float desk = sdRoundBox(p - vec3(78.0, 26.4, 0.0), vec3(46.0, 1.6, 70.0), 0.7);
  if (desk < res.x) res = vec2(desk, MAT_WOOD);
  // ノートPC
  vec3 lp = p - vec3(45.0, 28.75, -2.0);
  float base = sdRoundBox(lp, vec3(11.6, 0.75, 16.0), 0.55);
  vec3 hinge = vec3(56.4, 29.3, -2.0);
  vec3 sc = p - hinge;
  sc.xy = unrot(sc.xy, -0.30);
  float lid = sdRoundBox(sc - vec3(0.0, 11.0, 0.0), vec3(0.45, 11.2, 16.0), 0.4);
  float lap = min(base, lid);
  if (lap < res.x) {
    // 画面側の面はスクリーン
    res = vec2(lap, (lid < base && sc.x < -0.25) ? MAT_SCREEN : MAT_METAL);
  }
  return res;
}

vec2 map(vec3 p) {
  vec2 res = sdProps(p);
  return opMin(res, sdBodyM(p));
}

// 影と環境遮蔽用の粗い形状（細部は影の形にほとんど影響しない）
float mapCoarse(vec3 world) {
  vec3 p = bend(world);
  vec3 q = vec3(p.xy, abs(p.z));
  float d = sdTorso(p);
  vec3 sh = vec3(uAcromion, 16.8);
  d = min(d, length(q - sh) - 6.0);
  d = min(d, sdCapsule(q, vec3(uAcromion + vec2(0.2, -3.5), 18.0), vec3(uElbow, 19.5), 4.2));
  d = min(d, sdCapsule(q, vec3(uElbow, 19.5), vec3(uWrist + vec2(9.0, 0.0), 15.5), 3.2));
  d = min(d, sdCapsule(p, vec3(uNeckBase, 0.0), vec3(uPivot, 0.0), 4.6));
  vec3 h = headLocal(p, uPivot, uHeadAngle, uHeadRoll);
  // 頭は内接する楕円体にして、顔の表面が自分の粗い形状に埋もれて影になるのを防ぐ
  d = min(d, sdEllipsoid(h - vec3(1.8, 6.6, 0.0), vec3(8.6, 8.0, 6.6)) * HEAD_SCALE);
  d = min(d, sdCapsule(q, vec3(0.0, 9.5, 9.0), vec3(44.0, 10.5, 10.0), 7.5));
  d = min(d, sdCapsule(q, vec3(44.5, 9.5, 10.0), vec3(47.0, -36.0, 10.5), 3.6));
  // ここから下は家具（側屈させない）
  p = world;
  d = min(d, sdRoundCyl(p - vec3(6.0, -3.2, 0.0), 20.0, 3.4, 1.6));
  d = min(d, sdRoundBox(p - vec3(78.0, 26.4, 0.0), vec3(46.0, 1.6, 70.0), 0.7));
  vec3 sc = p - vec3(56.4, 29.3, -2.0);
  sc.xy = unrot(sc.xy, -0.30);
  d = min(d, sdRoundBox(sc - vec3(0.0, 11.0, 0.0), vec3(0.45, 11.2, 16.0), 0.4));
  d = min(d, sdRoundBox(p - vec3(45.0, 28.75, -2.0), vec3(11.6, 0.75, 16.0), 0.55));
  return d;
}

// ---------- spine (X-ray) ----------
float vertDepth(int i) {
  if (i < 5) return 3.6;
  if (i < 17) return mix(2.7, 2.0, float(i - 5) / 11.0);
  return 1.75;
}

vec2 sdSpine(vec3 p) {
  p = bend(p);
  float best = 1e5;
  float id = -1.0;
  for (int i = 0; i < 24; i++) {
    vec4 v = uVert[i];
    vec2 rel = p.xy - v.xy;
    if (dot(rel, rel) > 49.0) continue;
    vec3 l = vec3(unrot(rel, v.z), p.z);
    float dep = vertDepth(i);
    float h = v.w;
    float d = sdRoundBox(l, vec3(dep * 0.5, h * 0.5, dep * 0.62), min(h, dep) * 0.38);
    // 棘突起（後方へ斜め下）
    float proc = dep * (i < 17 ? 1.1 : 0.95);
    d = smin(d, sdCapsule(l, vec3(-dep * 0.45, 0.0, 0.0), vec3(-dep * 0.45 - proc, -h * 0.55, 0.0), h * 0.2), 0.5);
    // 横突起
    vec3 lq = vec3(l.xy, abs(l.z));
    d = smin(d, sdCapsule(lq, vec3(-dep * 0.4, 0.1, 0.0), vec3(-dep * 0.55, 0.15, dep * 0.95), h * 0.16), 0.4);
    if (d < best) { best = d; id = float(i); }
  }
  // 7cm 以内に椎骨が無いとき、最大の椎骨でも 3cm 以上離れている
  return vec2(min(best, 3.0), id);
}

// ---------- lighting ----------
vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(0.02, -0.02);
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}

vec3 spineNormal(vec3 p) {
  const vec2 e = vec2(0.015, -0.015);
  return normalize(e.xyy * sdSpine(p + e.xyy).x + e.yyx * sdSpine(p + e.yyx).x + e.yxy * sdSpine(p + e.yxy).x + e.xxx * sdSpine(p + e.xxx).x);
}

float softShadow(vec3 ro, vec3 rd, float tmin, float tmax, float k) {
#ifdef NO_SHADOW
  return 1.0;
#endif
  float res = 1.0;
  float t = tmin;
  for (int i = 0; i < 28; i++) {
    float h = mapCoarse(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.6, 8.0);
    if (res < 0.002 || t > tmax) break;
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}

float calcAO(vec3 p, vec3 n) {
#ifdef NO_AO
  return 1.0;
#endif
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 4; i++) {
    float h = 0.4 + 2.6 * float(i) / 3.0;
    float d = mapCoarse(p + n * h);
    occ += (h - d) * sca;
    sca *= 0.78;
  }
  return clamp(1.0 - 0.09 * occ, 0.0, 1.0);
}

float ggx(vec3 n, vec3 v, vec3 l, float rough) {
  vec3 h = normalize(v + l);
  float a = rough * rough;
  float a2 = a * a;
  float nh = max(dot(n, h), 0.0);
  float d = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * d * d);
  float nv = max(dot(n, v), 1e-3);
  float nl = max(dot(n, l), 0.0);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = nv / (nv * (1.0 - k) + k) * nl / (nl * (1.0 - k) + k);
  return D * G / (4.0 * nv * max(nl, 1e-3) + 1e-3) * nl;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}

const vec3 KEY_DIR = normalize(vec3(0.55, 0.72, 0.32));
const vec3 KEY_COL = vec3(1.0, 0.95, 0.88) * 1.4;
const vec3 RIM_DIR = normalize(vec3(-0.75, 0.35, -0.2));
const vec3 RIM_COL = vec3(0.55, 0.7, 1.0) * 1.1;
const vec3 SCREEN_POS = vec3(55.0, 42.0, -2.0);

vec3 hemi(vec3 n) {
  return mix(vec3(0.05, 0.04, 0.035), vec3(0.13, 0.15, 0.19), n.y * 0.5 + 0.5);
}

// 頸部・上背部の負担を、首の軸と上部胸椎への距離で色付けする
float strainAt(vec3 p) {
  p = bend(p);
  vec3 a = vec3(uNeckBase - vec2(2.5, 0.0), 0.0);
  vec3 b = vec3(uPivot, 0.0);
  float neck = sdCapsule(p, a, b, 0.0);
  float neckW = exp(-neck * neck / 70.0) * max(uSev.x, uSev.y);
  float back = sdCapsule(p, vec3(uVert[11].xy, 0.0), vec3(uVert[16].xy, 0.0), 0.0);
  float backW = exp(-back * back / 120.0) * uSev.z;
  // 左右の傾き: 縮んでいる側（倒れた側）の脇腹と首筋
  float ls = uLean >= 0.0 ? 1.0 : -1.0;
  float side = sdCapsule(p, vec3(uTorso[1].xy, ls * 12.0), vec3(uTorso[3].xy, ls * 13.5), 0.0);
  float sideW = exp(-side * side / 60.0) * smoothstep(0.03, 0.12, abs(uLean));
  float hs = uHeadRoll >= 0.0 ? 1.0 : -1.0;
  float neckSide = sdCapsule(p, vec3(uNeckBase, hs * 4.5), vec3(uPivot, hs * 4.5), 0.0);
  float neckSideW = exp(-neckSide * neckSide / 20.0) * smoothstep(0.05, 0.2, abs(uHeadRoll));
  float latW = max(sideW, neckSideW) * uSevLean;
  return clamp(max(max(neckW, backW * 0.85), latW * 0.85), 0.0, 1.0);
}

vec3 strainColor(float s) {
  return mix(vec3(1.0, 0.72, 0.28), vec3(1.0, 0.32, 0.24), smoothstep(0.35, 0.9, s));
}

// 人体側の素材の色・粗さ。顔の模様は頭の局所座標で決める
// 服を着たモデルの色は sRGB で指定し、最後に線形へ変換する
vec3 bodyAlbedo(vec3 p, float mat, out float rough, out float wrap, out float sheen) {
  vec3 pb = bend(p);
  vec3 h = headLocal(pb, uPivot, uHeadAngle, uHeadRoll);
  vec3 hq = vec3(h.xy, abs(h.z));
  float onHead = 1.0 - smoothstep(13.0, 15.0, length(h - vec3(3.0, 4.0, 0.0)));
  rough = 0.5;
  wrap = 0.3;
  sheen = 0.0;
  vec3 a;
  if (mat == MAT_CLOTH) {
#if defined(MODEL_CAT)
    a = vec3(0.44, 0.56, 0.46);
#elif defined(MODEL_BEAR)
    a = vec3(0.32, 0.46, 0.66);
#else
    a = vec3(0.55, 0.48, 0.74);
#endif
    // 編み目の細かいムラ
    a *= 0.95 + 0.06 * noise(pb.xy * 2.2 + pb.z * 1.3) + 0.03 * fbm(pb.xy * 0.4);
    rough = 0.88;
    wrap = 0.4;
    sheen = 0.3;
  } else if (mat == MAT_PANTS) {
    a = vec3(0.30, 0.33, 0.40) * (0.96 + 0.07 * noise(vec2(pb.x * 3.0 + pb.y * 3.0, pb.z * 0.5)));
    rough = 0.8;
    sheen = 0.15;
  } else if (mat == MAT_HAIR) {
    // 毛流れに沿った濃淡
    float phi = atan(h.z, h.x - 1.0);
    a = vec3(0.30, 0.20, 0.13) * (0.82 + 0.3 * fbm(vec2(phi * 9.0, h.y * 0.25)));
    rough = 0.62;
    wrap = 0.2;
  } else if (mat == MAT_EYE) {
#if defined(MODEL_CAT)
    vec3 e = normalize(hq - vec3(9.8, 3.9, 3.9));
    vec3 gaze = normalize(vec3(1.0, 0.0, 0.5));
    float c = dot(e, gaze);
    float slit = abs(dot(e, normalize(cross(gaze, vec3(0.0, 1.0, 0.0)))));
    a = mix(vec3(0.25, 0.20, 0.08), vec3(0.80, 0.76, 0.25), smoothstep(0.15, 0.45, c));
    a = mix(a, vec3(0.05), (1.0 - smoothstep(0.1, 0.17, slit)) * smoothstep(0.5, 0.65, c));
#elif defined(MODEL_BEAR)
    a = vec3(0.08);
#else
    vec3 e = normalize(hq - vec3(11.7, 3.2, 3.3));
    a = mix(vec3(0.28, 0.17, 0.10), vec3(0.05), smoothstep(0.75, 0.9, dot(e, normalize(vec3(1.0, 0.0, 0.3)))));
#endif
    rough = 0.08;
    wrap = 0.0;
  } else if (mat == MAT_NOSE) {
#if defined(MODEL_CAT)
    a = vec3(0.90, 0.62, 0.64);
    rough = 0.35;
#else
    a = vec3(0.10);
    rough = 0.2;
#endif
  } else if (mat == MAT_INNER) {
#if defined(MODEL_CAT)
    a = vec3(0.95, 0.72, 0.70);
#else
    a = vec3(0.75, 0.60, 0.46);
#endif
    rough = 0.6;
    wrap = 0.5;
    sheen = 0.25;
  } else if (mat == MAT_JOINT) {
    // クルミ材の関節
    a = mix(vec3(0.17, 0.09, 0.05), vec3(0.32, 0.19, 0.10), fbm(vec2(pb.x * 0.9 + pb.z * 0.4, pb.y * 0.12)));
    rough = 0.3;
    wrap = 0.15;
  } else {
#if defined(MODEL_CLAY)
    a = vec3(0.86, 0.82, 0.76) * (0.97 + 0.05 * fbm(p.xy * 0.5 + p.z * 0.3));
    rough = 0.55;
    wrap = 0.45;
#elif defined(MODEL_WOOD)
    // ブナ材: 胴は縦、手足は長さ方向（横）に流れる木目
    float vertical = 1.0 - smoothstep(0.0, 1.0, sdTorso(pb));
    vec2 gp = mix(vec2(pb.y * 0.05, pb.x * 0.7 + pb.z * 0.25), vec2(pb.x * 0.05, pb.y * 0.7 + pb.z * 0.25), vertical);
    float g = fbm(vec2(gp.x, gp.y + fbm(gp * 0.6) * 2.5));
    float rings = smoothstep(0.55, 0.9, sin(gp.y * 9.0 + g * 8.0) * 0.5 + 0.5);
    a = mix(vec3(0.66, 0.47, 0.29), vec3(0.80, 0.62, 0.42), g);
    a *= 1.0 - 0.12 * rings;
    rough = 0.36;
    wrap = 0.2;
#elif defined(MODEL_BUDDY)
    a = vec3(0.96, 0.80, 0.68);
    vec3 cheek = hq - vec3(10.0, 0.2, 4.6);
    a = mix(a, vec3(0.98, 0.62, 0.60), exp(-dot(cheek, cheek) / 2.5) * 0.45 * onHead);
    rough = 0.5;
    wrap = 0.45;
#elif defined(MODEL_CAT)
    // 茶トラ: 頭は額から後ろへ流れる縞と頬の縞、首としっぽは輪状の縞
    float sTop = sin(hq.z * 2.4 + fbm(h.xy * 0.4) * 2.0);
    float sCheek = sin(h.y * 1.5 - h.x * 0.5 + fbm(h.xz * 0.4) * 1.5);
    float sBody = sin(pb.x * 0.6 - pb.y * 0.9 + fbm(pb.xy * 0.2) * 2.5);
    float stripe = smoothstep(0.35, 0.8, mix(sBody, mix(sCheek, sTop, smoothstep(5.0, 9.0, h.y)), onHead));
    a = mix(vec3(0.90, 0.58, 0.28), vec3(0.62, 0.32, 0.13), stripe * 0.8);
    // 口元とあご、前足は白
    float muzzle = (1.0 - smoothstep(0.9, 1.25, length((hq - vec3(10.8, -1.2, 1.2)) / vec3(3.0, 3.0, 3.2)))) * onHead;
    float paw = 1.0 - smoothstep(6.0, 8.0, length(pb.xy - (uWrist + vec2(4.5, 0.0))));
    a = mix(a, vec3(0.95, 0.93, 0.89), max(muzzle, paw));
    a *= 0.96 + 0.08 * fbm(pb.xy * 1.5 + pb.z * 0.7);
    rough = 0.7;
    wrap = 0.5;
    sheen = 0.5;
#elif defined(MODEL_BEAR)
    a = vec3(0.50, 0.33, 0.20);
    float muzzle = 1.0 - smoothstep(0.9, 1.15, length((h - vec3(10.6, -0.9, 0.0)) / vec3(4.6, 3.6, 4.0)));
    a = mix(a, vec3(0.80, 0.66, 0.50), muzzle * onHead);
    a *= 0.96 + 0.08 * fbm(pb.xy * 1.5 + pb.z * 0.7);
    rough = 0.7;
    wrap = 0.5;
    sheen = 0.5;
#else
    a = vec3(0.60, 0.53, 0.48);
    // 微細な表面のムラ（素焼きのマネキン肌）
    a *= 0.96 + 0.06 * fbm(p.xy * 0.35 + p.z * 0.2);
    rough = 0.48;
    wrap = 0.35;
#endif
  }
#ifdef DRESSED
  a = pow(a, vec3(2.2));
#endif
  return a;
}

vec3 shadeSurface(vec3 p, vec3 n, vec3 rd, float mat) {
  vec3 v = -rd;
  vec3 albedo;
  float rough;
  float metal = 0.0;
  float wrap = 0.0;
  vec3 emissive = vec3(0.0);
  float sheen = 0.0;

  if (isBody(mat)) {
    albedo = bodyAlbedo(p, mat, rough, wrap, sheen);
    if (mat == MAT_SKIN || mat == MAT_CLOTH) {
      float s = strainAt(p);
      vec3 sc = strainColor(s);
      albedo = mix(albedo, sc * 0.85, s * 0.55);
      emissive = sc * s * (0.06 + 0.05 * sin(uTime * 3.0)) * step(0.3, uSev.w);
    }
  } else if (mat == MAT_WOOD) {
    float grain = fbm(vec2(p.x * 0.08, p.z * 1.6 + fbm(p.xz * 0.05) * 3.0));
    albedo = mix(vec3(0.16, 0.085, 0.045), vec3(0.34, 0.2, 0.11), grain);
    rough = 0.42;
  } else if (mat == MAT_FABRIC) {
    albedo = vec3(0.11, 0.12, 0.13) * (0.9 + 0.2 * noise(p.xz * 3.0));
    rough = 0.85;
  } else if (mat == MAT_SCREEN) {
    albedo = vec3(0.02);
    rough = 0.12;
    emissive = vec3(0.10, 0.16, 0.24) * 1.2;
  } else {
    albedo = vec3(0.72, 0.73, 0.75);
    rough = 0.32;
    metal = 1.0;
  }

  float sh = softShadow(p + n * 0.15, KEY_DIR, 0.6, 160.0, 5.0);
  float ao = calcAO(p, n);
  float nl = dot(n, KEY_DIR);
  float dif = clamp((nl + wrap) / (1.0 + wrap), 0.0, 1.0);
  vec3 f0 = mix(vec3(0.04), albedo, metal);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 5.0);

  vec3 col = albedo * (1.0 - metal) * KEY_COL * dif * mix(0.15, 1.0, sh);
  col += (f0 + (1.0 - f0) * fres) * KEY_COL * ggx(n, v, KEY_DIR, rough) * sh;
  col += albedo * hemi(n) * ao * (1.0 - 0.6 * metal);
  // 背面からのリムライトで輪郭を背景から分離
  float rim = clamp(dot(n, RIM_DIR), 0.0, 1.0);
  col += RIM_COL * albedo * rim * 0.9 * ao + RIM_COL * ggx(n, v, RIM_DIR, max(rough, 0.3)) * 0.6;
  // 画面からのわずかな照り返し
  vec3 toScreen = SCREEN_POS - p;
  float sd = length(toScreen);
  col += albedo * vec3(0.25, 0.4, 0.6) * max(dot(n, toScreen / sd), 0.0) * 18.0 / (sd + 20.0) * 0.12;
  // 布や毛の、輪郭付近でふわりと明るくなる散乱
  col += albedo * sheen * pow(1.0 - max(dot(n, v), 0.0), 3.0) * (0.5 + 0.7 * sh) * ao;
  if (mat == MAT_EYE) {
    // 目に映り込む窓の光
    col += vec3(0.9) * smoothstep(0.96, 0.985, dot(reflect(rd, n), normalize(vec3(0.35, 0.55, 0.75))));
  }
#ifndef MODEL_WOOD
  if (mat == MAT_SKIN) {
    // 明暗境界の赤み（皮下散乱の近似）
    float sss = smoothstep(-0.25, 0.2, nl) - smoothstep(0.2, 0.7, nl);
    col += albedo * vec3(0.9, 0.35, 0.25) * sss * 0.22 * sh;
  }
#endif
  if (metal > 0.5) {
    vec3 r = reflect(rd, n);
    col += f0 * mix(vec3(0.06, 0.06, 0.07), vec3(0.45, 0.48, 0.55), smoothstep(-0.2, 0.6, r.y)) * ao;
  }
  return col + emissive;
}

vec3 background(vec2 uv, vec3 rd) {
  vec3 top = vec3(0.020, 0.024, 0.031);
  vec3 bottom = vec3(0.006, 0.007, 0.009);
  vec3 col = mix(bottom, top, smoothstep(-0.9, 0.9, uv.y));
  float glow = exp(-dot(uv - vec2(-0.15, 0.2), uv - vec2(-0.15, 0.2)) * 1.6);
  col += vec3(0.030, 0.036, 0.046) * glow;
  return col;
}

vec2 boxHit(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (bmin - ro) * inv;
  vec3 t1 = (bmax - ro) * inv;
  vec3 tn = min(t0, t1);
  vec3 tf = max(t0, t1);
  return vec2(max(max(tn.x, tn.y), tn.z), min(min(tf.x, tf.y), tf.z));
}

vec2 sphereHit(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float h = b * b - dot(oc, oc) + r * r;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCamFwd * uFocal + uCamRight * uv.x + uCamUp * uv.y);
  float pix = 2.0 / (uRes.y * uFocal);

  // ---- main march ----
  // シーン全体の箱と交差しない光線は背景のみ
  vec2 bb = boxHit(ro, rd, vec3(-40.0, -95.0, -75.0), vec3(126.0, 100.0, 75.0));
  float t = max(bb.x, 1.0);
  float tmax = min(bb.y, 600.0);
  vec2 hit = vec2(-1.0);
  for (int i = 0; i < 128; i++) {
    if (t > tmax) break;
    vec3 p = ro + rd * t;
    vec2 h = map(p);
    if (h.x < 0.35 * t * pix) { hit = vec2(t, h.y); break; }
    t += h.x * 0.85;
    if (t > tmax) break;
  }

  vec3 col = background(uv, rd);
  if (hit.x > 0.0) {
    vec3 p = ro + rd * hit.x;
    vec3 n = calcNormal(p);
    vec3 surf = shadeSurface(p, n, rd, hit.y);
#ifdef NO_XRAY
    if (false) {
#else
    if (isBody(hit.y) && uXray > 0.001) {
#endif
      // 体内を進んで背骨を探す
      float ts = 0.4;
      vec2 sh = vec2(-1.0);
      for (int i = 0; i < 40; i++) {
        vec3 q = p + rd * ts;
        vec2 s = sdSpine(q);
        if (s.x < 0.03) { sh = vec2(ts, s.y); break; }
        ts += max(s.x * 0.9, 0.05);
        if (ts > 45.0) break;
      }
      // 骨が無い部分は皮膚をわずかに沈ませるだけにして、まだらな暗部を作らない
      vec3 inner = surf * vec3(0.78, 0.72, 0.70);
      if (sh.x > 0.0) {
        vec3 q = p + rd * sh.x;
        vec3 bn = spineNormal(q);
        int idx = int(sh.y + 0.5);
        float sev = idx >= 17 ? max(uSev.x, uSev.y) : (idx >= 9 ? uSev.z * smoothstep(9.0, 16.0, float(idx)) : 0.0);
        vec3 bone = mix(vec3(0.93, 0.89, 0.80), strainColor(sev), smoothstep(0.15, 0.8, sev) * 0.85);
        float bl = clamp((dot(bn, KEY_DIR) + 0.4) / 1.4, 0.0, 1.0);
        float bspec = ggx(bn, -rd, KEY_DIR, 0.38);
        inner = bone * (0.35 + 1.25 * bl) + vec3(1.0) * bspec * 0.6 + bone * hemi(bn) * 0.5;
        // 皮膚の奥にある分の減衰
        inner *= exp(-sh.x * 0.012);
      }
      float fres = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
      float alpha = sh.x > 0.0 ? mix(0.22, 0.92, fres) : 0.0;
      // 透過は背骨の周辺だけ。顔・腕・脚は不透明のまま
      // 横から見た平面上（z を無視）で背骨に近い部分
      vec3 pb = bend(p);
      vec3 ps = vec3(pb.xy, 0.0);
      float spineDist = sdCapsule(ps, vec3(uVert[0].xy, 0.0), vec3(uC7, 0.0), 0.0);
      spineDist = min(spineDist, sdCapsule(ps, vec3(uC7, 0.0), vec3(uPivot, 0.0), 0.0));
      float region = 1.0 - smoothstep(10.0, 18.0, spineDist);
      region *= smoothstep(-1.0, 1.5, sdHead(pb, uPivot, uHeadAngle, uHeadRoll));
      col = mix(surf, mix(inner, surf, alpha), uXray * region);
    } else {
      col = surf;
    }
    // 遠方を背景へなじませる
    col = mix(col, background(uv, rd), smoothstep(330.0, 480.0, hit.x));
  }

  // ---- 理想姿勢のゴースト（常に最前面に輪郭を描く） ----
  vec2 gs = sphereHit(ro, rd, vec3(uGPivot + vec2(2.0, 1.0), 0.0), 24.0 * HEAD_SCALE + 3.0);
#ifdef NO_GHOST
  if (false) {
#else
  if (uGhost > 0.001 && gs.y > 0.0) {
#endif
    float tg = max(gs.x, 1.0);
    float minD = 1e5;
    float hitG = -1.0;
    for (int i = 0; i < 64; i++) {
      vec3 p = ro + rd * tg;
      float d = sdGhost(p);
      minD = min(minD, d / tg);
      if (d < 0.01) { hitG = tg; break; }
      tg += d * 0.9;
      if (tg > gs.y) break;
    }
    vec3 ghostCol = vec3(0.30, 0.92, 0.78);
    float edgeW = pix * 1.6;
    float line = 0.0;
    if (hitG > 0.0) {
      vec3 p = ro + rd * hitG;
      const vec2 e = vec2(0.03, -0.03);
      vec3 gn = normalize(e.xyy * sdGhost(p + e.xyy) + e.yyx * sdGhost(p + e.yyx) + e.yxy * sdGhost(p + e.yxy) + e.xxx * sdGhost(p + e.xxx));
      float f = 1.0 - abs(dot(gn, rd));
      line = 0.025 + smoothstep(0.8, 0.98, f) * 0.8;
    } else {
      line = (1.0 - smoothstep(edgeW * 0.6, edgeW * 2.2, minD)) * 0.95;
    }
    col = mix(col, ghostCol, clamp(line, 0.0, 1.0) * uGhost);
  }

  col = aces(col * 0.95);
  col = pow(col, vec3(1.0 / 2.2));
  // わずかなビネット
  col *= 1.0 - 0.18 * dot(uv * 0.55, uv * 0.55);
  // バンディング防止のディザ
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}
`;
