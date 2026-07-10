import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard, Card, EmptyState, Badge } from '@/components/ui';
import { DonutCard, TrendCard, type TrendPoint } from '@/components/DashCharts';
import { date } from '@/lib/format';

export const dynamic = 'force-dynamic';

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

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

  // Son 6 aylık pencere (bu ay dahil): trend grafiği için (yıl, ay) çiftleri
  const windowMonths: { y: number; m: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    windowMonths.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
  }
  const windowStartISO = new Date(windowMonths[0].y, windowMonths[0].m - 1, 1).toISOString();

  const [
    { count: totalResidents },
    { count: pendingApprovals },
    { data: monthAccruals },
    { data: collections },
    { count: openComplaints },
    { data: recentPending },
    { data: openDebts },
    { data: trendAccruals },
  ] = await Promise.all([
    sb.from('users').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).in('role', ['resident', 'manager']).eq('approval_status', 'approved'),
    sb.from('users').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).eq('approval_status', 'pending'),
    // Bu ayın tahakkukları — halka grafiği + "ödendi/ödenmedi" kartları tek sorgudan
    sb.from('accruals').select('status')
      .eq('site_id', siteId).eq('period_month', month).eq('period_year', year),
    sb.from('collections').select('amount, paid_at').eq('site_id', siteId),
    sb.from('complaints').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).in('status', ['open', 'in_progress']),
    sb.from('users').select('id, full_name, apartment_number, block, created_at')
      .eq('site_id', siteId).eq('approval_status', 'pending')
      .order('created_at', { ascending: false }).limit(5),
    // Açık borç yaşlandırması: kapatılmamış tahakkukların kalan anaparası + vade
    sb.from('accruals').select('principal_remaining, due_date')
      .eq('site_id', siteId).in('status', ['open', 'partial']),
    // Trend: son 6 ayın tahakkuk tutarları (dönem alanına göre)
    sb.from('accruals').select('amount, period_month, period_year')
      .eq('site_id', siteId).gte('period_year', windowMonths[0].y),
  ]);

  // ── Bu ay aidat durumu (halka 1) ──
  const statuses = (monthAccruals ?? []).map((a) => a.status as string);
  const paidThisMonth = statuses.filter((s) => s === 'paid').length;
  const partialThisMonth = statuses.filter((s) => s === 'partial').length;
  const openThisMonth = statuses.filter((s) => s === 'open').length;
  const monthTotal = paidThisMonth + partialThisMonth + openThisMonth;
  const paidPct = monthTotal > 0 ? Math.round((paidThisMonth / monthTotal) * 100) : 0;

  // ── Açık borç yaşlandırması (halka 2) ──
  const today = now.getTime();
  const aging = { fresh: 0, mid: 0, old: 0 };
  for (const d of openDebts ?? []) {
    const remaining = Number(d.principal_remaining ?? 0);
    if (remaining <= 0) continue;
    const days = d.due_date ? Math.floor((today - new Date(d.due_date).getTime()) / 86_400_000) : 0;
    if (days > 90) aging.old += remaining;
    else if (days > 30) aging.mid += remaining;
    else aging.fresh += remaining;
  }
  const totalOpenDebt = aging.fresh + aging.mid + aging.old;

  // ── Son 6 ay trendi (çizgi) ──
  const accByPeriod = new Map<string, number>();
  for (const a of trendAccruals ?? []) {
    const key = `${a.period_year}-${a.period_month}`;
    accByPeriod.set(key, (accByPeriod.get(key) ?? 0) + Number(a.amount ?? 0));
  }
  const colByPeriod = new Map<string, number>();
  for (const c of collections ?? []) {
    if (!c.paid_at || c.paid_at < windowStartISO) continue;
    const d = new Date(c.paid_at);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    colByPeriod.set(key, (colByPeriod.get(key) ?? 0) + Number(c.amount ?? 0));
  }
  const trend: TrendPoint[] = windowMonths.map(({ y, m }) => ({
    label: AY_KISA[m - 1],
    tahakkuk: accByPeriod.get(`${y}-${m}`) ?? 0,
    tahsilat: colByPeriod.get(`${y}-${m}`) ?? 0,
  }));

  const totalCollected = (collections ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);
  const monthLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const tl = (v: number) => `₺${Math.round(v).toLocaleString('tr-TR')}`;

  return (
    <>
      <PageHeader title={`Hoş geldiniz, ${manager.fullName ?? 'Yönetici'}`} subtitle={`${manager.siteName} · ${monthLabel}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Sakin" value={totalResidents ?? 0} icon="👥" />
        <StatCard label="Onay Bekleyen" value={pendingApprovals ?? 0} tone={pendingApprovals ? 'warning' : 'default'} icon="✅" />
        <StatCard label="Bu Ay Ödendi" value={paidThisMonth} tone="success" icon="💰" />
        <StatCard label="Bu Ay Ödenmedi" value={openThisMonth + partialThisMonth} tone={openThisMonth + partialThisMonth ? 'danger' : 'default'} icon="⏳" />
        <StatCard label="Toplam Tahsilat" value={tl(totalCollected)} icon="🏦" />
        <StatCard label="Açık Şikayet" value={openComplaints ?? 0} tone={openComplaints ? 'warning' : 'default'} icon="📣" />
      </div>

      {/* Grafikler — sayfa her açılışta canlı DB'den hesaplanır (force-dynamic) */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="lg:col-span-2">
          <TrendCard title="Son 6 Ay — Tahakkuk vs Tahsilat" points={trend} />
        </div>
        <DonutCard
          title={`Bu Ay Aidat Durumu (${monthLabel})`}
          slices={[
            { label: 'Ödendi', value: paidThisMonth, color: '#2a78d6' },
            { label: 'Kısmi Ödendi', value: partialThisMonth, color: '#c98500' },
            { label: 'Ödenmedi', value: openThisMonth, color: '#d03b3b' },
          ]}
          centerValue={`%${paidPct}`}
          centerLabel="tahsilat oranı"
          emptyText="Bu ay için tahakkuk yok — Tahakkuk & Aidat ekranından üretebilirsiniz."
          valueFmt={(v) => `${v} daire`}
        />
        <DonutCard
          title="Açık Borç Yaşlandırma"
          slices={[
            { label: '0–30 gün', value: aging.fresh, color: '#86b6ef' },
            { label: '31–90 gün', value: aging.mid, color: '#2a78d6' },
            { label: '90+ gün', value: aging.old, color: '#104281' },
          ]}
          centerValue={tl(totalOpenDebt)}
          centerLabel="açık anapara"
          emptyText="Açık borç yok 🎉"
          valueFmt={tl}
        />
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
            <QuickLink href="/units?f=borclu" icon="💰" label="Tahsilat Al" />
            <QuickLink href="/units" icon="🏠" label="Daireler & Sakinler" />
            <QuickLink href="/accruals" icon="🧾" label="Borç Tahakkuku" />
            <QuickLink href="/announcements" icon="📣" label="Duyuru Yayınla" />
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
