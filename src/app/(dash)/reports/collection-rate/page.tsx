import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard, Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { ReportControls, type ExportSheet } from '@/components/ReportControls';
import { money } from '@/lib/format';
import { donemLabel } from '@/lib/reports';

export const dynamic = 'force-dynamic';

type Acc = { period_year: number; period_month: number; amount: number | null; principal_remaining: number | null; status: string };

export default async function CollectionRateReport() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('accruals')
    .select('period_year, period_month, amount, principal_remaining, status')
    .eq('site_id', manager.siteId)
    .limit(20000);

  const rows = (data ?? []) as Acc[];

  // Dönem bazlı: waived hariç tahakkuk vs tahsil
  const map = new Map<string, { year: number; month: number; accrued: number; remaining: number; waived: number; count: number }>();
  for (const a of rows) {
    const key = `${a.period_year}-${String(a.period_month).padStart(2, '0')}`;
    const cur = map.get(key) ?? { year: a.period_year, month: a.period_month, accrued: 0, remaining: 0, waived: 0, count: 0 };
    cur.count += 1;
    if (a.status === 'waived') {
      cur.waived += Number(a.amount ?? 0);
    } else {
      cur.accrued += Number(a.amount ?? 0);
      if (a.status === 'open' || a.status === 'partial') cur.remaining += Number(a.principal_remaining ?? 0);
    }
    map.set(key, cur);
  }

  const periods = [...map.entries()]
    .map(([key, v]) => {
      const collected = v.accrued - v.remaining;
      const rate = v.accrued > 0 ? (collected / v.accrued) * 100 : 0;
      return { key, ...v, collected, rate, label: donemLabel(v.year, v.month) };
    })
    .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));

  const totAccrued = periods.reduce((s, p) => s + p.accrued, 0);
  const totCollected = periods.reduce((s, p) => s + p.collected, 0);
  const totWaived = periods.reduce((s, p) => s + p.waived, 0);
  const overallRate = totAccrued > 0 ? (totCollected / totAccrued) * 100 : 0;

  const rateTone = (r: number): 'green' | 'amber' | 'red' => (r >= 90 ? 'green' : r >= 60 ? 'amber' : 'red');

  const sheets: ExportSheet[] = [
    { name: 'Tahsilat Oranı', rows: periods.map((p) => ({
      'Dönem': p.label, 'Tahakkuk': p.accrued, 'Tahsil': p.collected, 'Kalan': p.remaining,
      'Vazgeçilen': p.waived, 'Oran (%)': Math.round(p.rate * 10) / 10,
    })) },
    { name: 'Genel', rows: [{ 'Toplam Tahakkuk': totAccrued, 'Toplam Tahsil': totCollected, 'Vazgeçilen': totWaived, 'Genel Oran (%)': Math.round(overallRate * 10) / 10 }] },
  ];

  return (
    <>
      <PageHeader title="Aidat Tahsilat Oranı" subtitle="Dönem bazında tahakkuk vs tahsil (vazgeçilenler hariç)" />
      <ReportControls from="" to="" sheets={sheets} fileName="tahsilat-orani.xlsx" showRange={false} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Toplam Tahakkuk" value={money(totAccrued, true)} icon="🧾" />
        <StatCard label="Toplam Tahsil" value={money(totCollected, true)} tone="success" icon="💰" />
        <StatCard label="Vazgeçilen" value={money(totWaived, true)} icon="✖️" />
        <StatCard label="Genel Oran" value={`%${Math.round(overallRate * 10) / 10}`} tone={overallRate >= 90 ? 'success' : overallRate >= 60 ? 'warning' : 'danger'} icon="🎯" />
      </div>

      <Card title="Dönem Bazında">
        {periods.length === 0 ? <EmptyState>Henüz tahakkuk kaydı yok.</EmptyState> : (
          <Table>
            <thead><tr><Th>Dönem</Th><Th className="text-right">Tahakkuk</Th><Th className="text-right">Tahsil</Th><Th className="text-right">Kalan</Th><Th className="text-right">Vazgeçilen</Th><Th className="text-right">Oran</Th></tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.key} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-700">{p.label}</Td>
                  <Td className="text-right text-slate-600">{money(p.accrued, true)}</Td>
                  <Td className="text-right text-emerald-600">{money(p.collected, true)}</Td>
                  <Td className="text-right text-red-600">{money(p.remaining, true)}</Td>
                  <Td className="text-right text-slate-400">{p.waived > 0 ? money(p.waived, true) : '—'}</Td>
                  <Td className="text-right"><Badge tone={rateTone(p.rate)}>%{Math.round(p.rate * 10) / 10}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
