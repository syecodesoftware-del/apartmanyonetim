'use client';

import { useNav } from '@/components/NavProvider';

/** Header'da mobilde görünen hamburger butonu (drawer'ı açar). */
export function MobileMenuButton() {
  const { setOpen } = useNav();
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Menüyü aç"
      className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}
