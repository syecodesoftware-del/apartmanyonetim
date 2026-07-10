'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';
import { useNav } from '@/components/NavProvider';

function isActive(pathname: string, item: (typeof NAV_ITEMS)[number]): boolean {
  if (item.href === '/') return pathname === '/';
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function Sidebar({ siteName, showPortfolio, badges = {} }: {
  siteName: string;
  showPortfolio: boolean;
  /** href → bekleyen iş sayısı (örn. onay bekleyen başvuru, açık şikayet) */
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const { open, setOpen } = useNav();

  const items = NAV_ITEMS.filter((it) => !it.portfolioOnly || showPortfolio);

  const content = (
    <>
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">KA</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-slate-900">Komşu Asistanı</p>
          <p className="truncate text-xs text-slate-500">{siteName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const badge = badges[item.href] ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">Yönetici Web Paneli</div>
    </>
  );

  return (
    <>
      {/* Masaüstü — sabit sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">{content}</aside>

      {/* Mobil — çekmece (drawer) */}
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
    </>
  );
}
