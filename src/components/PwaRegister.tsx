'use client';

import { useEffect } from 'react';

/** Sakin portalı PWA service worker'ını yalnız /portal kapsamıyla kaydeder. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const reg = navigator.serviceWorker.register('/sw.js', { scope: '/portal' }).catch(() => {});
    return () => { void reg; };
  }, []);
  return null;
}
