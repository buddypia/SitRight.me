'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PostureScene } from '@/components/PostureScene/PostureScene';
import { MESSAGES } from '@/i18n/messages';

/** 3D シーン単体の確認用ページ（/lab?f=6&p=0&s=0&x=1） */
function Lab() {
  const q = useSearchParams();
  const n = (k: string, d = 0) => Number(q.get(k) ?? d);
  const rig = {
    headForwardCm: n('f'),
    headPitchDeg: n('p'),
    thoracicFlexDeg: n('s'),
    shoulderProtractCm: n('r'),
  };
  const sev = { forward: n('sf'), down: n('sd'), slump: n('ss'), lean: 0 };
  return (
    <main
      className="h-dvh w-full p-4"
      style={q.get('w') ? { width: n('w'), height: n('h') } : undefined}
    >
      <PostureScene
        rig={rig}
        severity={sev}
        xray={q.get('x') !== '0'}
        guides={q.get('g') !== '0'}
        demo={q.get('demo') === '1'}
        t={MESSAGES.ja}
        className="h-full w-full rounded-panel"
      />
    </main>
  );
}

export default function LabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <Suspense>
      <Lab />
    </Suspense>
  );
}
