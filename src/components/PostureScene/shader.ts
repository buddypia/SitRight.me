/**
 * 横向きの人体（マネキン）と背骨をレイマーチングで描くフラグメントシェーダー。
 * 単位は cm。x: 前, y: 上, z: 体の右（カメラ側）。人体は左右対称なので多くの部位で abs(z) を使う。
 */
export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 aPos;
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

uniform vec2 uGNeckBase;
uniform vec2 uGPivot;
uniform vec3 uGTorso;

uniform vec4 uSev;      // forward, down, slump, overall
uniform float uXray;
uniform float uGhost;
uniform float uBreath;

#define MAT_SKIN 1.0
#define MAT_WOOD 2.0
#define MAT_METAL 3.0
#define MAT_SCREEN 4.0
#define MAT_FABRIC 5.0

const float PI = 3.14159265;

// ---------- SDF primitives ----------
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

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

// ---------- body ----------
float sdHead(vec3 p, vec2 pivot, float ang) {
  vec3 h = vec3(unrot(p.xy - pivot, ang), p.z);
  float bound = length(h - vec3(3.5, 3.5, 0.0)) - 17.0;
  if (bound > 5.0) return bound;
  vec3 hq = vec3(h.xy, abs(h.z));
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
  return d;
}

float sdNeck(vec3 p, vec2 base, vec2 pivot, float ang) {
  vec2 top = pivot + rotf(vec2(1.6, 0.4), ang);
  return sdRoundCone(p, vec3(base, 0.0), vec3(top, 0.0), 6.0, 5.0);
}

float torsoPart(vec3 p, vec3 t, vec3 r) {
  return sdEllipsoid(vec3(unrot(p.xy - t.xy, t.z), p.z), r);
}

float sdTorso(vec3 p) {
  // 胴体全体を包むカプセルで遠方を早期に打ち切る
  float bound = sdCapsule(p, vec3(uTorso[0].xy, 0.0), vec3(uTorso[4].xy, 0.0), 21.0);
  // ブレンド半径（最大 7cm）より外側でのみ打ち切り、継ぎ目を出さない
  if (bound > 10.0) return bound;
  float breath = 1.0 + 0.012 * uBreath;
  float d = torsoPart(p, uTorso[0], vec3(12.0, 10.5, 17.0));
  d = smin(d, torsoPart(p, uTorso[1], vec3(9.6, 9.0, 14.0)), 7.0);
  d = smin(d, torsoPart(p, uTorso[2], vec3(11.0 * breath, 9.5, 15.2)), 7.0);
  d = smin(d, torsoPart(p, uTorso[3], vec3(11.6 * breath, 10.0, 16.0 * breath)), 7.0);
  d = smin(d, torsoPart(p, uTorso[4], vec3(9.0, 7.5, 15.5)), 7.0);
  return d;
}

float sdBody(vec3 p) {
  vec3 q = vec3(p.xy, abs(p.z));
  float d = sdTorso(p);
  // 僧帽筋と三角筋
  vec3 trap = vec3(uNeckBase + vec2(-1.2, 2.2), 3.5);
  vec3 sh = vec3(uAcromion, 16.8);
  d = smin(d, sdRoundCone(q, trap, sh, 4.6, 4.0), 5.0);
  d = smin(d, sdEllipsoid(q - (sh + vec3(0.6, -3.0, 1.6)), vec3(5.5, 6.8, 4.9)), 3.0);
  // 腕（デスク上の手まで）
  vec3 shJ = vec3(uAcromion + vec2(0.2, -3.5), 18.0);
  vec3 el = vec3(uElbow, 19.5);
  vec3 wr = vec3(uWrist, 15.5);
  float armBound = min(sdCapsule(q, shJ, el, 8.0), sdCapsule(q, el, wr + vec3(9.0, 0.0, 0.0), 8.0));
  float arm = armBound;
  if (armBound < 5.0) {
  arm = sdRoundCone(q, shJ, el, 4.6, 3.6);
  arm = smin(arm, sdRoundCone(q, el, wr, 3.6, 2.5), 1.6);
  // 手: 甲・指（キーボードへ軽く曲げる）・親指
  vec3 hp = q - (wr + vec3(4.2, 0.1, -0.6));
  hp.xz = unrot(hp.xz, 0.12);
  float hand = sdEllipsoid(hp, vec3(4.2, 1.45, 3.9));
  hand = smin(hand, sdRoundCone(hp, vec3(3.0, 0.0, 0.0), vec3(7.4, -0.9, 0.0), 1.15, 0.95), 1.4);
  hand = smin(hand, sdRoundCone(hp, vec3(7.2, -0.8, 0.0), vec3(9.0, -2.2, 0.0), 0.95, 0.8), 0.6);
  hand = smax(hand, -sdRoundBox(vec3(hp.x - 7.5, hp.y, abs(fract(hp.z / 2.0 + 0.5) - 0.5) * 2.0), vec3(3.5, 3.0, 0.08), 0.06), 0.3);
  hand = smin(hand, sdRoundCone(hp, vec3(0.5, -0.4, 2.6), vec3(4.6, -1.2, 3.9), 1.1, 0.75), 1.0);
  arm = smin(arm, hand, 1.4);
  }
  d = smin(d, arm, 2.0);
  // 首と頭
  d = smin(d, sdNeck(p, uNeckBase, uPivot, uHeadAngle), 4.0);
  d = smin(d, sdHead(p, uPivot, uHeadAngle), 2.8);
  // 太もも（座面の上）
  d = smin(d, sdRoundCone(q, vec3(0.0, 9.5, 9.0), vec3(44.0, 10.5, 10.0), 8.6, 6.0), 6.0);
  // すね（膝から床へ）
  d = smin(d, sdRoundCone(q, vec3(44.5, 9.5, 10.0), vec3(47.0, -36.0, 10.5), 5.6, 3.6), 2.5);
  return d;
}

float sdGhost(vec3 p) {
  float d = sdNeck(p, uGNeckBase, uGPivot, 0.0);
  d = smin(d, sdHead(p, uGPivot, 0.0), 2.8);
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
  float body = sdBody(p);
  if (body < res.x) res = vec2(body, MAT_SKIN);
  return res;
}

// 影と環境遮蔽用の粗い形状（細部は影の形にほとんど影響しない）
float mapCoarse(vec3 p) {
  vec3 q = vec3(p.xy, abs(p.z));
  float d = sdTorso(p);
  vec3 sh = vec3(uAcromion, 16.8);
  d = min(d, length(q - sh) - 6.0);
  d = min(d, sdCapsule(q, vec3(uAcromion + vec2(0.2, -3.5), 18.0), vec3(uElbow, 19.5), 4.2));
  d = min(d, sdCapsule(q, vec3(uElbow, 19.5), vec3(uWrist + vec2(9.0, 0.0), 15.5), 3.2));
  d = min(d, sdCapsule(p, vec3(uNeckBase, 0.0), vec3(uPivot, 0.0), 4.6));
  vec3 h = vec3(unrot(p.xy - uPivot, uHeadAngle), p.z);
  // 頭は内接する楕円体にして、顔の表面が自分の粗い形状に埋もれて影になるのを防ぐ
  d = min(d, sdEllipsoid(h - vec3(1.8, 6.6, 0.0), vec3(8.6, 8.0, 6.6)));
  d = min(d, sdCapsule(q, vec3(0.0, 9.5, 9.0), vec3(44.0, 10.5, 10.0), 7.5));
  d = min(d, sdCapsule(q, vec3(44.5, 9.5, 10.0), vec3(47.0, -36.0, 10.5), 3.6));
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
  vec3 a = vec3(uNeckBase - vec2(2.5, 0.0), 0.0);
  vec3 b = vec3(uPivot, 0.0);
  float neck = sdCapsule(p, a, b, 0.0);
  float neckW = exp(-neck * neck / 70.0) * max(uSev.x, uSev.y);
  float back = sdCapsule(p, vec3(uVert[11].xy, 0.0), vec3(uVert[16].xy, 0.0), 0.0);
  float backW = exp(-back * back / 120.0) * uSev.z;
  return clamp(max(neckW, backW * 0.85), 0.0, 1.0);
}

vec3 strainColor(float s) {
  return mix(vec3(1.0, 0.72, 0.28), vec3(1.0, 0.32, 0.24), smoothstep(0.35, 0.9, s));
}

vec3 shadeSurface(vec3 p, vec3 n, vec3 rd, float mat) {
  vec3 v = -rd;
  vec3 albedo;
  float rough;
  float metal = 0.0;
  float wrap = 0.0;
  vec3 emissive = vec3(0.0);

  if (mat == MAT_SKIN) {
    albedo = vec3(0.60, 0.53, 0.48);
    // 微細な表面のムラ（素焼きのマネキン肌）
    albedo *= 0.96 + 0.06 * fbm(p.xy * 0.35 + p.z * 0.2);
    rough = 0.48;
    wrap = 0.35;
    float s = strainAt(p);
    vec3 sc = strainColor(s);
    albedo = mix(albedo, sc * 0.85, s * 0.55);
    emissive = sc * s * (0.06 + 0.05 * sin(uTime * 3.0)) * step(0.3, uSev.w);
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
  if (mat == MAT_SKIN) {
    // 明暗境界の赤み（皮下散乱の近似）
    float sss = smoothstep(-0.25, 0.2, nl) - smoothstep(0.2, 0.7, nl);
    col += albedo * vec3(0.9, 0.35, 0.25) * sss * 0.22 * sh;
  }
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
    if (hit.y == MAT_SKIN && uXray > 0.001) {
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
      vec3 ps = vec3(p.xy, 0.0);
      float spineDist = sdCapsule(ps, vec3(uVert[0].xy, 0.0), vec3(uC7, 0.0), 0.0);
      spineDist = min(spineDist, sdCapsule(ps, vec3(uC7, 0.0), vec3(uPivot, 0.0), 0.0));
      float region = 1.0 - smoothstep(10.0, 18.0, spineDist);
      region *= smoothstep(-1.0, 1.5, sdHead(p, uPivot, uHeadAngle));
      col = mix(surf, mix(inner, surf, alpha), uXray * region);
    } else {
      col = surf;
    }
    // 遠方を背景へなじませる
    col = mix(col, background(uv, rd), smoothstep(330.0, 480.0, hit.x));
  }

  // ---- 理想姿勢のゴースト（常に最前面に輪郭を描く） ----
  vec2 gs = sphereHit(ro, rd, vec3(uGPivot + vec2(2.0, 1.0), 0.0), 24.0);
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
