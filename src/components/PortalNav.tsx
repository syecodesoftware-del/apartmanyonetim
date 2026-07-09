'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/portal', label: 'Özet', icon: '🏠' },
  { href: '/portal/dues', label: 'Borçlarım', icon: '💳' },
  { href: '/portal/announcements', label: 'Duyurular', icon: '📣' },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {ITEMS.map((it) => {
        const active = it.href === '/portal' ? pathname === '/portal' : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="mr-1">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
