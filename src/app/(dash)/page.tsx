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

type QueueItem = { id: string; amount: number; overdue: boolean };
type InspectionRow = { id: string };
type WorkOrderRow = { id: string; status: string; due_date: string | null };
type DmThread = { unread: number };
type Summary = {
  month_accruals: { paid: number; partial: number; open: number; open_amount: number };
  aging: { fresh: number; mid: number; old: number };
  trend: { y: number; m: number; tahakkuk: number; tahsilat: number }[];
  month_collected: number;
};

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

  const [
    { count: totalResidents },
    { count: pendingApprovals },
    summaryRes,
    { count: openComplaints },
    { data: recentPending },
    { data: balances },
    queueRes,
    inspectionRes,
    workOrdersRes,
    dmRes,
    packagesRes,
  ] = await Promise.all([
    sb.from('users').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).in('role', ['resident', 'manager']).eq('approval_status', 'approved'),
    sb.from('users').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).eq('approval_status', 'pending'),
    // Bu ay aidat durumu + yaşlandırma + 6 aylık trend + bu ay tahsilat — tek aggregate RPC
    // (eskiden 4 satır-bazlı sorguydu; 300 daire × 3 yılda on binlerce satır çekiyordu)
    sb.rpc('get_dashboard_summary'),
    sb.from('complaints').select('*', { count: 'exact', head: true })
      .eq('site_id', siteId).in('status', ['open', 'in_progress']),
    sb.from('users').select('id, full_name, apartment_number, block, created_at')
      .eq('site_id', siteId).eq('approval_status', 'pending')
      .order('created_at', { ascending: false }).limit(5),
    // Kasa & banka güncel bakiyeleri (virman dahil)
    sb.from('cash_account_balances').select('cash_account_id, ad, tur, balance')
      .eq('site_id', siteId).eq('is_active', true),
    // Bugün/Dikkat sinyalleri
    sb.rpc('get_payment_queue'),
    sb.rpc('get_inspection_due', { p_within_days: 30 }),
    sb.rpc('get_work_orders', { p_status: undefined }),
    sb.rpc('get_dm_threads'),
    sb.rpc('get_packages', { p_status: 'teslim_alindi' }),
  ]);

  const summary = (summaryRes.data ?? {
    month_accruals: { paid: 0, partial: 0, open: 0, open_amount: 0 },
    aging: { fresh: 0, mid: 0, old: 0 },
    trend: [],
    month_collected: 0,
  }) as unknown as Summary;

  // ── Bu ay aidat durumu (halka 1) + açık tutar ──
  const paidThisMonth = Number(summary.month_accruals.paid ?? 0);
  const partialThisMonth = Number(summary.month_accruals.partial ?? 0);
  const openThisMonth = Number(summary.month_accruals.open ?? 0);
  const monthOpenAmount = Number(summary.month_accruals.open_amount ?? 0);
  const monthTotal = paidThisMonth + partialThisMonth + openThisMonth;
  const paidPct = monthTotal > 0 ? Math.round((paidThisMonth / monthTotal) * 100) : 0;

  // ── Açık borç yaşlandırması (halka 2) ──
  const aging = {
    fresh: Number(summary.aging.fresh ?? 0),
    mid: Number(summary.aging.mid ?? 0),
    old: Number(summary.aging.old ?? 0),
  };
  const totalOpenDebt = aging.fresh + aging.mid + aging.old;

  // ── Son 6 ay trendi (çizgi) + bu ay tahsilatı ──
  const monthCollected = Number(summary.month_collected ?? 0);
  const trend: TrendPoint[] = (summary.trend ?? []).map((t) => ({
    label: AY_KISA[t.m - 1],
    tahakkuk: Number(t.tahakkuk ?? 0),
    tahsilat: Number(t.tahsilat ?? 0),
  }));

  // ── Kasa & banka toplamı ──
  const balanceRows = (balances ?? []) as { ad: string | null; balance: number | null }[];
  const totalBalance = balanceRows.reduce((s, b) => s + Number(b.balance ?? 0), 0);
  const balanceHint = balanceRows.length > 1
    ? balanceRows.map((b) => `${b.ad}: ₺${Math.round(Number(b.balance ?? 0)).toLocaleString('tr-TR')}`).join(' · ')
    : undefined;

  // ── Bugün / Dikkat sinyalleri ──
  const queue = ((queueRes.data ?? []) as unknown as QueueItem[]).filter((q) => q.overdue);
  const overdueInvoiceTotal = queue.reduce((s, q) => s + Number(q.amount), 0);
  const inspections = (inspectionRes.data ?? []) as unknown as InspectionRow[];
  const todayISO = new Date(year, month - 1, now.getDate()).toISOString().slice(0, 10);
  const lateWorkOrders = ((workOrdersRes.data ?? []) as unknown as WorkOrderRow[])
    .filter((w) => w.due_date && w.due_date < todayISO && !['tamamlandi', 'iptal'].includes(w.status));
  const unreadDm = ((dmRes.data ?? []) as unknown as DmThread[]).reduce((s, t) => s + Number(t.unread ?? 0), 0);
  const pendingPackages = ((packagesRes.data ?? []) as unknown as { id: string }[]).length;

  const attention: { icon: string; text: string; href: string; tone: 'red' | 'amber' | 'blue' }[] = [];
  if (queue.length > 0) attention.push({ icon: '🧾', text: `${queue.length} faturanın vadesi geçti (toplam ${tlFmt(overdueInvoiceTotal)})`, href: '/suppliers', tone: 'red' });
  if (lateWorkOrders.length > 0) attention.push({ icon: '🔧', text: `${lateWorkOrders.length} iş talebinin termini geçti`, href: '/work-orders', tone: 'red' });
  if (inspections.length > 0) attention.push({ icon: '🛗', text: `${inspections.length} demirbaşın periyodik muayenesi yaklaşıyor/geçti`, href: '/inventory', tone: 'amber' });
  if (unreadDm > 0) attention.push({ icon: '💬', text: `${unreadDm} okunmamış sakin mesajı var`, href: '/messages', tone: 'blue' });
  if (pendingPackages > 0) attention.push({ icon: '📦', text: `${pendingPackages} kargo yönetimde teslim bekliyor`, href: '/gate', tone: 'blue' });
  if ((pendingApprovals ?? 0) > 0) attention.push({ icon: '✅', text: `${pendingApprovals} sakin başvurusu onay bekliyor`, href: '/approvals', tone: 'amber' });

  const monthLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader title={`Hoş geldiniz, ${manager.fullName ?? 'Yönetici'}`} subtitle={`${manager.siteName} · ${monthLabel}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Kasa & Banka" value={tlFmt(totalBalance)} tone={totalBalance < 0 ? 'danger' : 'default'} hint={balanceHint} icon="🏦" href="/cash" />
        <StatCard label="Bu Ay Tahsilat" value={tlFmt(monthCollected)} tone="success" icon="💰" href="/cash" />
        <StatCard label="Bu Ay Ödenmedi" value={tlFmt(monthOpenAmount)} hint={monthTotal > 0 ? `${openThisMonth + partialThisMonth} daire` : undefined} tone={monthOpenAmount > 0.005 ? 'danger' : 'default'} icon="⏳" href="/units?f=borclu" />
        <StatCard label="Bu Ay Ödendi" value={paidThisMonth} hint={monthTotal > 0 ? `${monthTotal} tahakkuktan` : undefined} tone="success" icon="✅" href="/accruals" />
        <StatCard label="Sakin" value={totalResidents ?? 0} icon="👥" href="/units" />
        <StatCard label="Açık Şikayet" value={openComplaints ?? 0} tone={openComplaints ? 'warning' : 'default'} icon="📣" href="/complaints" />
      </div>

      {/* Bugün / Dikkat — sahadaki tüm modüllerden tek liste */}
      {attention.length > 0 && (
        <div className="mt-6">
          <Card title="Bugün / Dikkat">
            <ul className="divide-y divide-slate-50">
              {attention.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-slate-50">
                    <span className="flex items-center gap-2.5 text-sm text-slate-700">
                      <span className="text-lg">{a.icon}</span>
                      {a.text}
                    </span>
                    <span className={`text-xs font-semibold ${a.tone === 'red' ? 'text-red-600' : a.tone === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>Git →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

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
          unit="daire"
        />
        <DonutCard
          title="Açık Borç Yaşlandırma"
          slices={[
            { label: '0–30 gün', value: aging.fresh, color: '#86b6ef' },
            { label: '31–90 gün', value: aging.mid, color: '#2a78d6' },
            { label: '90+ gün', value: aging.old, color: '#104281' },
          ]}
          centerValue={tlFmt(totalOpenDebt)}
          centerLabel="açık anapara"
          emptyText="Açık borç yok 🎉"
          unit="tl"
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

function tlFmt(v: number) {
  return `₺${Math.round(v).toLocaleString('tr-TR')}`;
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
