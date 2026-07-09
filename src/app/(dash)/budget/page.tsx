import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { BudgetPanel, type BudgetHeader, type BudgetReportRow, type ChargeTypeOption } from '@/components/BudgetPanel';

export const dynamic = 'force-dynamic';

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(sp.year) || currentYear;

  const [{ data: budgets }, { data: chargeTypes }] = await Promise.all([
    sb.from('budgets').select('id, year, name, note, status').eq('site_id', manager.siteId).order('year', { ascending: false }),
    sb.from('charge_types').select('id, ad').eq('site_id', manager.siteId).eq('is_active', true).order('ad'),
  ]);

  const list = (budgets ?? []) as BudgetHeader[];
  const selected = list.find((b) => b.year === year) ?? null;

  let rows: BudgetReportRow[] = [];
  if (selected) {
    const { data } = await sb.rpc('get_budget_report', { p_budget_id: selected.id });
    rows = (data ?? []) as BudgetReportRow[];
  }

  return (
    <>
      <PageHeader
        title="İşletme Projesi (Bütçe)"
        subtitle="Yıllık gider kalemleri + dağıtım anahtarı → aylık otomatik tahakkuk · planlanan/gerçekleşen"
      />
      <BudgetPanel
        year={year}
        currentYear={currentYear}
        budgets={list}
        selected={selected}
        rows={rows}
        chargeTypes={(chargeTypes ?? []) as ChargeTypeOption[]}
      />
    </>
  );
}
