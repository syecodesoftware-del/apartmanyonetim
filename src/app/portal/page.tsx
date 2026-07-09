import Link from 'next/link';
import { requireResident } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { StatCard, Card, Badge } from '@/components/ui';
import { money, date } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PRIORITY: Record<string, { label: string; tone: 'slate' | 'blue' | 'amber' | 'red' }> = {
  low: { label: 'Bilgi', tone: 'slate' },
  normal: { label: 'Normal', tone: 'blue' },
  high: { label: 'Önemli', tone: 'amber' },
  urgent: { label: 'Acil', tone: 'red' },
};

export default async function PortalHome() {
  const resident = await requireResident();
  const sb = await supabaseServer();

  const [{ data: accruals }, { data: announcements }] = await Promise.all([
    sb.from('accruals').select('principal_remaining, status').eq('debtor_user_id', resident.userId).eq('site_id', resident.siteId).eq('status', 'open'),
    sb.from('announcements').select('id, title, content, priority, created_at').eq('site_id', resident.siteId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
  ]);

  const totalDebt = (accruals ?? []).reduce((a, r) => a + Number(r.principal_remaining ?? 0), 0);
  const openCount = (accruals ?? []).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Toplam Borç" value={money(totalDebt, true)} tone={totalDebt > 0 ? 'danger' : 'success'} />
        <StatCard label="Açık Tahakkuk" value={openCount} hint={openCount > 0 ? 'ödenmemiş dönem' : 'borcunuz yok'} />
      </div>

      {totalDebt > 0 && (
        <Link href="/portal/dues" className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700">
          Borç detayını görüntüle →
        </Link>
      )}

      <Card title="Son Duyurular">
        {(announcements ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Henüz duyuru yok.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {(announcements ?? []).map((a) => {
              const p = PRIORITY[a.priority ?? 'normal'] ?? PRIORITY.normal;
              return (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone={p.tone}>{p.label}</Badge>
                    <span className="text-xs text-slate-400">{date(a.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                  <p className="line-clamp-2 text-sm text-slate-500">{a.content}</p>
                </li>
              );
            })}
          </ul>
        )}
        <div className="pt-2">
          <Link href="/portal/announcements" className="text-sm font-medium text-blue-600 hover:underline">Tüm duyurular →</Link>
        </div>
      </Card>
    </div>
  );
}
