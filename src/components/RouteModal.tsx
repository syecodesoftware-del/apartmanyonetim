'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** Intercepted route içeriğini popup olarak gösterir; kapatınca geldiği listeye döner. */
export function RouteModal({ title, subtitle, fullHref, children }: {
  title: string;
  subtitle?: string;
  fullHref?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8" onClick={close}>
      <div className="w-full max-w-5xl rounded-2xl bg-slate-100 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-white px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {fullHref && (
              <Link href={fullHref} target="_blank" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                Tam sayfa ↗
              </Link>
            )}
            <button onClick={close} aria-label="Kapat" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              ✕
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
