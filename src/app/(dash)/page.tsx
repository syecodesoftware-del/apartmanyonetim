import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard, Card, EmptyState, Badge } from '@/components/ui';
import { date } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const siteId = manager.siteId;

  // Onboarding: sitede hiç daire yoksa ilk veri girişine yönlendir ("Şimdilik atla" çerezi hariç).
  if (!manager.readOnly) {
    const { count: unitCount } = await sb
      .from('units').select('*', { count: 'exact', head: true }).eq('site_id', siteId);
    if ((unitCount ?? 0) === 0 && (await cookies()).get('onboarding-skip')?.value !== '1') {
      redirect('/onboarding');
    }
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Cari defterden (accruals/collections) — useManagerStats ile aynı mantık.
  const [
    { count: totalResidents },
    { count: pendingApprovals },
    { count: paidThisMonth },
    { count: unpaidThisMonth },
    { data: collections },
    { count: openComplaints },
    { data: recentPending },
  ] = await Promise.all([
    sb.from('users').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).in('role', ['resident', 'manager']).eq('approval_status', 'approved'),
    sb.from('users').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).eq('approval_status', 'pending'),
    sb.from('accruals').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).eq('status', 'paid').eq('period_month', month).eq('period_year', year),
    sb.from('accruals').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).in('status', ['open', 'partial']).eq('period_month', month).eq('period_year', year),
    sb.from('collections').select('amount').eq('site_id', siteId),
    sb.from('complaints').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).in('status', ['open', 'in_progress']),
    sb.from('users').select('id, full_name, apartment_number, block, created_at')
      .eq('site_id', siteId).eq('approval_status', 'pending')
      .order('created_at', { ascending: false }).limit(5),
  ]);

  const totalCollected = (collections ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);
  const monthLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader title={`Hoş geldiniz, ${manager.fullName ?? 'Yönetici'}`} subtitle={`${manager.siteName} · ${monthLabel}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Sakin" value={totalResidents ?? 0} icon="👥" />
        <StatCard label="Onay Bekleyen" value={pendingApprovals ?? 0} tone={pendingApprovals ? 'warning' : 'default'} icon="✅" />
        <StatCard label="Bu Ay Ödendi" value={paidThisMonth ?? 0} tone="success" icon="💰" />
        <StatCard label="Bu Ay Ödenmedi" value={unpaidThisMonth ?? 0} tone={unpaidThisMonth ? 'danger' : 'default'} icon="⏳" />
        <StatCard label="Toplam Tahsilat" value={`₺${Math.round(totalCollected).toLocaleString('tr-TR')}`} icon="🏦" />
        <StatCard label="Açık Şikayet" value={openComplaints ?? 0} tone={openComplaints ? 'warning' : 'default'} icon="📣" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Onay Bekleyen Sakinler"
          action={<Link href="/approvals" className="text-xs font-semibold text-blue-600 hover:underline">Tümü →</Link>}
        >
          {(recentPending ?? []).length === 0 ? (
            <EmptyState>Bekleyen onay yok 🎉</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-50">
              {(recentPending ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {[r.block, r.apartment_number].filter(Boolean).join(' / ') || '—'} · {date(r.created_at)}
                    </p>
                  </div>
                  <Badge tone="amber">Bekliyor</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Hızlı İşlemler">
          <div className="grid grid-cols-2 gap-3">
            <QuickLink href="/approvals" icon="✅" label="Başvuru & Davetler" />
            <QuickLink href="/residents" icon="👥" label="Sakinler" />
            <QuickLink href="/approvals?davet=1" icon="✉️" label="Davet Gönder" />
            <QuickLink href="/units" icon="🏠" label="Daireler" />
          </div>
        </Card>
      </div>
    </>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-5 text-center transition hover:border-blue-300 hover:bg-blue-50"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </Link>
  );
}
