'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { findCluster, matchesPath } from '@/lib/tabs';

/** İlişkili ekranları tek çatı altında gösteren sekme çubuğu.
 *  Layout'ta durur; sayfa bir kümeye aitse otomatik görünür. */
export function ClusterTabs() {
  const pathname = usePathname();
  const cluster = findCluster(pathname);
  if (!cluster) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3">
      {cluster.items.map((it) => {
        const active = matchesPath(pathname, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
