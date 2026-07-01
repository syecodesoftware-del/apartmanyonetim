'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Membership = { siteId: string; siteName: string; role: string };

/**
 * Aktif site değiştirici (aktif-işaretçi modeli).
 * switch_active_site RPC çağrılır → users.* güncellenir → sayfa yenilenir.
 */
export function SiteSwitcher({ memberships, activeSiteId }: { memberships: Membership[]; activeSiteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [switching, setSwitching] = useState(false);

  if (memberships.length <= 1) return null;

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const siteId = e.target.value;
    if (siteId === activeSiteId) return;
    setSwitching(true);
    const { error } = await supabaseBrowser().rpc('switch_active_site', { p_site_id: siteId });
    setSwitching(false);
    if (error) {
      alert('Site değiştirilemedi: ' + error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={activeSiteId}
      onChange={onChange}
      disabled={switching || pending}
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 disabled:opacity-60"
    >
      {memberships.map((m) => (
        <option key={m.siteId} value={m.siteId}>
          {m.siteName}
        </option>
      ))}
    </select>
  );
}
