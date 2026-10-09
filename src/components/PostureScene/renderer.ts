import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader';
import type { CameraBasis, SceneAnchors } from './sceneMath';

export interface RenderState {
  anchors: SceneAnchors;
  ghost: SceneAnchors;
  camera: CameraBasis;
  /** forward, down, slump, overall（0..1） */
  severity: [number, number, number, number];
  /** 左右の傾きの深刻度（0..1） */
  leanSeverity: number;
  xray: number;
  ghostOpacity: number;
  breath: number;
  time: number;
}

const UNIFORMS = [
  'uRes',
  'uTime',
  'uCamPos',
  'uCamRight',
  'uCamUp',
  'uCamFwd',
  'uFocal',
  'uTorso',
  'uC7',
  'uNeckBase',
  'uPivot',
  'uHeadAngle',
  'uAcromion',
  'uElbow',
  'uWrist',
  'uVert',
  'uLean',
  'uHeadRoll',
  'uSevLean',
  'uGNeckBase',
  'uGPivot',
  'uGTorso',
  'uSev',
  'uXray',
  'uGhost',
  'uBreath',
] as const;

type UniformName = (typeof UNIFORMS)[number];

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

/** 全画面三角形1枚にフラグメントシェーダーを走らせる最小構成の WebGL2 レンダラー */
export class SceneRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  /** 切り替え中のモデルのプログラム。コンパイルが終わるまで今のモデルを描き続ける */
  private pending: { program: WebGLProgram; key: string } | null = null;
  private programKey = '';
  private parallelExt: { COMPLETION_STATUS_KHR: number } | null = null;
  private buffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private loc = {} as Record<UniformName, WebGLUniformLocation | null>;
  private vertData = new Float32Array(24 * 4);
  private torsoData = new Float32Array(5 * 3);
  lost = false;
  private timerExt: {
    TIME_ELAPSED_EXT: number;
    GPU_DISJOINT_EXT: number;
  } | null = null;
  private pendingQueries: WebGLQuery[] = [];
  /** 直近に計測できた GPU 描画時間（ms）。計測不可の環境では null */
  gpuMs: number | null = null;
  /** GPU が無くソフトウェアで WebGL を処理している環境 */
  readonly software: boolean;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private defines: string[] = []
  ) {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : '';
    this.software = /swiftshader|llvmpipe|software|basic render/i.test(name);
    this.timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.parallelExt = gl.getExtension('KHR_parallel_shader_compile');
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
    this.setup();
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
  };

  private onRestored = () => {
    this.lost = false;
    this.pending = null;
    this.setup();
  };

  /** define 付きでシェーダーをリンクする（完了は待たない） */
  private buildProgram(defines: string[]): WebGLProgram {
    const gl = this.gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const header = defines.map((d) => `#define ${d}\n`).join('');
    const fs = compile(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER.replace(
        'precision highp float;',
        `precision highp float;\n${header}`
      )
    );
    const program = gl.createProgram();
    if (!program) throw new Error('createProgram failed');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  private useLinked(program: WebGLProgram, key: string) {
    const gl = this.gl;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link error: ${log}`);
    }
    if (this.program) gl.deleteProgram(this.program);
    this.program = program;
    this.programKey = key;
    for (const name of UNIFORMS)
      this.loc[name] = gl.getUniformLocation(program, name);
  }

  /**
   * 表示するモデルなどの define を切り替える。対応環境ではバックグラウンドでコンパイルし、
   * 終わるまで今の絵を描き続けるので、切り替えで描画が止まらない。
   */
  setDefines(defines: string[]): void {
    const key = defines.join('|');
    if (key === (this.pending?.key ?? this.programKey)) return;
    this.defines = defines;
    if (this.lost) return;
    if (this.pending) this.gl.deleteProgram(this.pending.program);
    this.pending = { program: this.buildProgram(defines), key };
    if (!this.parallelExt) this.swapPending();
  }

  private swapPending() {
    const p = this.pending;
    if (!p) return;
    const ext = this.parallelExt;
    if (
      ext &&
      !this.gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR)
    )
      return;
    this.pending = null;
    try {
      this.useLinked(p.program, p.key);
    } catch (error) {
      // 新しいモデルが使えないときは今のモデルのまま描き続ける
      console.error('[scene] variant compile failed', error);
    }
  }

  private setup() {
    const gl = this.gl;
    this.program = null;
    this.useLinked(this.buildProgram(this.defines), this.defines.join('|'));
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    // aPos は location 0 に固定して、どのモデルのプログラムでも同じ VAO を使う
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  render(s: RenderState): void {
    if (this.lost) return;
    this.swapPending();
    if (!this.program) return;
    const gl = this.gl;
    const L = this.loc;
    const a = s.anchors;
    const sk = a.skeleton;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniform2f(L.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(L.uTime, s.time);
    gl.uniform3fv(L.uCamPos, s.camera.pos);
    gl.uniform3fv(L.uCamRight, s.camera.right);
    gl.uniform3fv(L.uCamUp, s.camera.up);
    gl.uniform3fv(L.uCamFwd, s.camera.fwd);
    gl.uniform1f(L.uFocal, s.camera.focal);

    a.torso.forEach((t, i) => this.torsoData.set(t, i * 3));
    gl.uniform3fv(L.uTorso, this.torsoData);
    gl.uniform2f(L.uC7, sk.c7.x, sk.c7.y);
    gl.uniform2f(L.uNeckBase, a.neckBase.x, a.neckBase.y);
    gl.uniform2f(L.uPivot, sk.skullPivot.x, sk.skullPivot.y);
    gl.uniform1f(L.uHeadAngle, sk.headAngle);
    gl.uniform2f(L.uAcromion, sk.acromion.x, sk.acromion.y);
    gl.uniform2f(L.uElbow, a.elbow.x, a.elbow.y);
    gl.uniform2f(L.uWrist, a.wrist.x, a.wrist.y);
    sk.vertebrae.forEach((v, i) => {
      // 椎間板の隙間を残すため、椎体は区間長の 78% の高さにする
      const seg = v.region === 0 ? 12 / 7 : v.region === 1 ? 28 / 12 : 17 / 5;
      this.vertData.set([v.x, v.y, v.angle, seg * 0.78], i * 4);
    });
    gl.uniform4fv(L.uVert, this.vertData);
    gl.uniform1f(L.uLean, a.leanRad);
    gl.uniform1f(L.uHeadRoll, a.headRollRad);

    const g = s.ghost;
    gl.uniform2f(L.uGNeckBase, g.neckBase.x, g.neckBase.y);
    gl.uniform2f(L.uGPivot, g.skeleton.skullPivot.x, g.skeleton.skullPivot.y);
    gl.uniform3fv(L.uGTorso, g.torso[4]);

    gl.uniform4fv(L.uSev, s.severity);
    gl.uniform1f(L.uSevLean, s.leanSeverity);
    gl.uniform1f(L.uXray, s.xray);
    gl.uniform1f(L.uGhost, s.ghostOpacity);
    gl.uniform1f(L.uBreath, s.breath);
    const query =
      this.timerExt && this.pendingQueries.length < 4 ? gl.createQuery() : null;
    if (query && this.timerExt)
      gl.beginQuery(this.timerExt.TIME_ELAPSED_EXT, query);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (query && this.timerExt) {
      gl.endQuery(this.timerExt.TIME_ELAPSED_EXT);
      this.pendingQueries.push(query);
    }
    this.collectQueries();
  }

  /** GPU 時間の計測結果を非同期に回収する（描画を待たせない） */
  private collectQueries() {
    const gl = this.gl;
    const ext = this.timerExt;
    if (!ext) return;
    while (this.pendingQueries.length) {
      const q = this.pendingQueries[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      if (!disjoint)
        this.gpuMs =
          this.gpuMs === null ? ns / 1e6 : this.gpuMs * 0.8 + (ns / 1e6) * 0.2;
      gl.deleteQuery(q);
      this.pendingQueries.shift();
    }
  }

  /** GPU の処理完了まで待つ（計測用） */
  finish(): void {
    this.gl.readPixels(
      0,
      0,
      1,
      1,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      this.pixel
    );
  }

  private pixel = new Uint8Array(4);

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    const gl = this.gl;
    this.pendingQueries.forEach((q) => gl.deleteQuery(q));
    this.pendingQueries = [];
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
    if (this.pending) gl.deleteProgram(this.pending.program);
    this.program = null;
    this.pending = null;
    // loseContext() は呼ばない: 同じ canvas で再初期化される場合（React の再マウント）に失われたままになるため
  }
}
