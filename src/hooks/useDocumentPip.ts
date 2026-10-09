'use client';

import { useCallback, useEffect, useState } from 'react';

// Document Picture-in-Picture API（Chrome / Edge 116+）。TypeScript の DOM 型にはまだ無い
interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  readonly window: Window | null;
}

function getApi(): DocumentPictureInPicture | null {
  if (typeof window === 'undefined') return null;
  return (
    (
      window as unknown as {
        documentPictureInPicture?: DocumentPictureInPicture;
      }
    ).documentPictureInPicture ?? null
  );
}

/** 親ページのスタイル（Tailwind / CSS 変数）を小窓にも適用する */
function copyStyles(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = target.createElement('style');
      style.textContent = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join('\n');
      target.head.appendChild(style);
    } catch {
      // 別オリジンのシートは cssRules を読めないので link で読み込む
      if (!sheet.href) continue;
      const link = target.createElement('link');
      link.rel = 'stylesheet';
      link.href = sheet.href;
      target.head.appendChild(link);
    }
  }
  target.documentElement.lang = document.documentElement.lang;
}

/** 常に最前面に表示される小窓を開き、その window を返す（React からは createPortal で描画する） */
export function useDocumentPip() {
  // 画面はストアの復元後（クライアント）にだけ描画されるので、初期値で判定してよい
  const [supported] = useState(() => getApi() !== null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const open = useCallback(async (size: { width: number; height: number }) => {
    const api = getApi();
    if (!api) return;
    if (api.window) {
      api.window.focus();
      return;
    }
    // ユーザー操作（クリック）の中で呼ぶ必要がある
    const win = await api.requestWindow(size);
    copyStyles(win.document);
    win.document.title = document.title;
    win.addEventListener('pagehide', () => setPipWindow(null), {
      once: true,
    });
    setPipWindow(win);
  }, []);

  const close = useCallback(() => {
    getApi()?.window?.close();
    setPipWindow(null);
  }, []);

  // 画面を離れたら小窓も閉じる
  useEffect(() => () => getApi()?.window?.close(), []);

  return { supported, pipWindow, open, close };
}
