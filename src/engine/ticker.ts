/**
 * 表示中は requestAnimationFrame、バックグラウンドでは Worker のタイマーで処理を回す。
 * ブラウザは非表示タブの rAF を止め、メインスレッドのタイマーも強く間引くため、
 * 姿勢監視を別タブ作業中も続けるには Worker からの postMessage で起こす必要がある。
 */
export class HybridTicker {
  private raf = 0;
  private worker: Worker | null = null;
  private running = false;
  private lastRun = 0;

  constructor(
    private readonly onTick: (now: number) => void,
    private readonly getIntervalMs: (hidden: boolean) => number
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    document.addEventListener('visibilitychange', this.sync);
    this.sync();
  }

  stop(): void {
    this.running = false;
    document.removeEventListener('visibilitychange', this.sync);
    cancelAnimationFrame(this.raf);
    this.worker?.terminate();
    this.worker = null;
  }

  private sync = () => {
    if (!this.running) return;
    cancelAnimationFrame(this.raf);
    if (document.hidden) {
      this.ensureWorker().postMessage(this.getIntervalMs(true));
    } else {
      this.worker?.postMessage(0);
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  private frame = (now: number) => {
    if (!this.running || document.hidden) return;
    this.maybeRun(now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private maybeRun(now: number) {
    if (now - this.lastRun < this.getIntervalMs(document.hidden) - 2) return;
    this.lastRun = now;
    this.onTick(now);
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const src = `let id=0;onmessage=(e)=>{clearInterval(id);if(e.data>0)id=setInterval(()=>postMessage(0),e.data);};`;
    const url = URL.createObjectURL(
      new Blob([src], { type: 'text/javascript' })
    );
    this.worker = new Worker(url);
    URL.revokeObjectURL(url);
    this.worker.onmessage = () => {
      if (this.running && document.hidden) this.maybeRun(performance.now());
    };
    return this.worker;
  }
}
