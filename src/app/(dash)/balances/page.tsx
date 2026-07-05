import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard } from '@/components/ui';
import { BalancesPanel, type BalanceRow } from '@/components/BalancesPanel';

export const dynamic = 'force-dynamic';

export default async function BalancesPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('unit_balances')
    .select('unit_id, block, apartment_number, kalan_anapara, kalan_gecikme, toplam_borc, avans, net_borc')
    .eq('site_id', manager.siteId)
    .order('toplam_borc', { ascending: false });

  const balances = (data ?? []) as BalanceRow[];
  const totalDebt = balances.reduce((s, b) => s + (b.toplam_borc ?? 0), 0);
  const totalAdvance = balances.reduce((s, b) => s + (b.avans ?? 0), 0);
  const debtorCount = balances.filter((b) => (b.toplam_borc ?? 0) > 0.005).length;

  return (
    <>
      <PageHeader title="Borç & Tahsilat" subtitle="Daire bazlı cari bakiye, tahsilat ve gecikme tazminatı" />
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Toplam Açık Borç" value={`₺${Math.round(totalDebt).toLocaleString('tr-TR')}`} tone={totalDebt > 0 ? 'danger' : 'success'} />
        <StatCard label="Toplam Avans" value={`₺${Math.round(totalAdvance).toLocaleString('tr-TR')}`} tone="success" />
        <StatCard label="Borçlu Daire" value={debtorCount} tone={debtorCount ? 'warning' : 'success'} />
        <StatCard label="Toplam Daire" value={balances.length} />
      </div>
      <BalancesPanel balances={balances} siteId={manager.siteId} />
    </>
  );
}
