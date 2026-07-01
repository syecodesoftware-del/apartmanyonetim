import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard, Card, Table, Th, Td, EmptyState } from '@/components/ui';
import { ReportControls, type ExportSheet } from '@/components/ReportControls';
import { parseRange, toExclusive } from '@/lib/reports';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', bank: 'Banka/Havale', online: 'Online', qr: 'QR' };

export default async function IncomeExpenseReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const { from, to } = parseRange(await searchParams);
  const toEx = toExclusive(to);

  const [{ data: collections }, { data: expenses }] = await Promise.all([
    sb.from('collections').select('amount, method, paid_at').eq('site_id', manager.siteId).gte('paid_at', from).lt('paid_at', toEx),
    sb.from('cash_expenses').select('amount, category, spent_at').eq('site_id', manager.siteId).gte('spent_at', from).lte('spent_at', to),
  ]);

  const inc = collections ?? [];
  const exp = expenses ?? [];
  const totalIncome = inc.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const totalExpense = exp.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const net = totalIncome - totalExpense;

  // Gelir — yönteme göre
  const byMethod = new Map<string, { count: number; amount: number }>();
  for (const c of inc) {
    const k = c.method ?? 'cash';
    const cur = byMethod.get(k) ?? { count: 0, amount: 0 };
    cur.count += 1; cur.amount += Number(c.amount ?? 0);
    byMethod.set(k, cur);
  }
  const incomeRows = [...byMethod.entries()].map(([m, v]) => ({ yontem: METHOD_LABEL[m] ?? m, adet: v.count, tutar: v.amount })).sort((a, b) => b.tutar - a.tutar);

  // Gider — kategoriye göre
  const byCat = new Map<string, { count: number; amount: number }>();
  for (const e of exp) {
    const k = e.category?.trim() || 'Diğer';
    const cur = byCat.get(k) ?? { count: 0, amount: 0 };
    cur.count += 1; cur.amount += Number(e.amount ?? 0);
    byCat.set(k, cur);
  }
  const expenseRows = [...byCat.entries()].map(([c, v]) => ({ kategori: c, adet: v.count, tutar: v.amount })).sort((a, b) => b.tutar - a.tutar);

  const sheets: ExportSheet[] = [
    { name: 'Özet', rows: [
      { 'Başlangıç': from, 'Bitiş': to, 'Toplam Gelir': totalIncome, 'Toplam Gider': totalExpense, 'Net': net },
    ] },
    { name: 'Gelir (Yöntem)', rows: incomeRows.map((r) => ({ 'Yöntem': r.yontem, 'Adet': r.adet, 'Tutar': r.tutar })) },
    { name: 'Gider (Kategori)', rows: expenseRows.map((r) => ({ 'Kategori': r.kategori, 'Adet': r.adet, 'Tutar': r.tutar })) },
  ];

  return (
    <>
      <PageHeader title="Gelir–Gider Raporu" subtitle={`${from} — ${to}`} />
      <ReportControls from={from} to={to} sheets={sheets} fileName={`gelir-gider-${from}_${to}.xlsx`} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Toplam Gelir" value={money(totalIncome, true)} tone="success" icon="💰" />
        <StatCard label="Toplam Gider" value={money(totalExpense, true)} tone="danger" icon="💸" />
        <StatCard label="Net" value={money(net, true)} tone={net >= 0 ? 'success' : 'danger'} icon="⚖️" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Gelir — Ödeme Yöntemi">
          {incomeRows.length === 0 ? <EmptyState>Bu aralıkta tahsilat yok.</EmptyState> : (
            <Table>
              <thead><tr><Th>Yöntem</Th><Th className="text-right">Adet</Th><Th className="text-right">Tutar</Th></tr></thead>
              <tbody>
                {incomeRows.map((r) => (
                  <tr key={r.yontem} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-700">{r.yontem}</Td>
                    <Td className="text-right text-slate-500">{r.adet}</Td>
                    <Td className="text-right font-semibold text-emerald-600">{money(r.tutar, true)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Gider — Kategori">
          {expenseRows.length === 0 ? <EmptyState>Bu aralıkta gider yok.</EmptyState> : (
            <Table>
              <thead><tr><Th>Kategori</Th><Th className="text-right">Adet</Th><Th className="text-right">Tutar</Th></tr></thead>
              <tbody>
                {expenseRows.map((r) => (
                  <tr key={r.kategori} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-700">{r.kategori}</Td>
                    <Td className="text-right text-slate-500">{r.adet}</Td>
                    <Td className="text-right font-semibold text-red-600">{money(r.tutar, true)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
