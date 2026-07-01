import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard, Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { ReportControls, type ExportSheet } from '@/components/ReportControls';
import { money } from '@/lib/format';
import { donemLabel } from '@/lib/reports';

export const dynamic = 'force-dynamic';

type Bal = { unit_id: string; block: string | null; apartment_number: string | null; kalan_anapara: number | null; kalan_gecikme: number | null; toplam_borc: number | null };
type Acc = { unit_id: string; period_year: number; period_month: number };

function bucket(months: number): { label: string; tone: 'slate' | 'amber' | 'red' } {
  if (months <= 1) return { label: '0–1 ay', tone: 'slate' };
  if (months <= 3) return { label: '1–3 ay', tone: 'amber' };
  return { label: '3+ ay', tone: 'red' };
}

export default async function AgingReport() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: balances }, { data: accruals }] = await Promise.all([
    sb.from('unit_balances').select('unit_id, block, apartment_number, kalan_anapara, kalan_gecikme, toplam_borc').eq('site_id', manager.siteId),
    sb.from('accruals').select('unit_id, period_year, period_month').eq('site_id', manager.siteId).in('status', ['open', 'partial']),
  ]);

  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + (now.getMonth() + 1);

  // Her daire için en eski açık tahakkuk dönemi
  const oldest = new Map<string, number>();
  for (const a of (accruals ?? []) as Acc[]) {
    const idx = a.period_year * 12 + a.period_month;
    const cur = oldest.get(a.unit_id);
    if (cur === undefined || idx < cur) oldest.set(a.unit_id, idx);
  }

  const debtors = ((balances ?? []) as Bal[])
    .filter((b) => Number(b.toplam_borc ?? 0) > 0.005)
    .map((b) => {
      const o = oldest.get(b.unit_id);
      const months = o ? Math.max(0, nowIdx - o) : 0;
      const oy = o ? Math.floor((o - 1) / 12) : 0;
      const om = o ? ((o - 1) % 12) + 1 : 0;
      return {
        ...b,
        label: [b.block, b.apartment_number].filter(Boolean).join(' / ') || '—',
        months,
        oldestLabel: o ? donemLabel(oy, om) : '—',
        bucket: bucket(months),
      };
    })
    .sort((a, b) => Number(b.toplam_borc ?? 0) - Number(a.toplam_borc ?? 0));

  const totalDebt = debtors.reduce((s, d) => s + Number(d.toplam_borc ?? 0), 0);
  const totalPrincipal = debtors.reduce((s, d) => s + Number(d.kalan_anapara ?? 0), 0);
  const totalLate = debtors.reduce((s, d) => s + Number(d.kalan_gecikme ?? 0), 0);

  const bucketSums = { '0–1 ay': 0, '1–3 ay': 0, '3+ ay': 0 } as Record<string, number>;
  for (const d of debtors) bucketSums[d.bucket.label] += Number(d.toplam_borc ?? 0);

  const sheets: ExportSheet[] = [
    { name: 'Borçlu Daireler', rows: debtors.map((d) => ({
      'Daire': d.label, 'Anapara': Number(d.kalan_anapara ?? 0), 'Gecikme': Number(d.kalan_gecikme ?? 0),
      'Toplam Borç': Number(d.toplam_borc ?? 0), 'En Eski Açık Dönem': d.oldestLabel, 'Gecikme (ay)': d.months, 'Yaş': d.bucket.label,
    })) },
    { name: 'Yaş Özeti', rows: Object.entries(bucketSums).map(([k, v]) => ({ 'Yaş Aralığı': k, 'Toplam Borç': v })) },
  ];

  return (
    <>
      <PageHeader title="Borç Yaşlandırma Raporu" subtitle={`${debtors.length} borçlu daire · anlık durum`} />
      <ReportControls from="" to="" sheets={sheets} fileName="borc-yaslandirma.xlsx" showRange={false} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Borçlu Daire" value={debtors.length} tone={debtors.length ? 'warning' : 'success'} icon="🏠" />
        <StatCard label="Toplam Anapara" value={money(totalPrincipal, true)} icon="📄" />
        <StatCard label="Toplam Gecikme" value={money(totalLate, true)} tone="danger" icon="⏰" />
        <StatCard label="Toplam Borç" value={money(totalDebt, true)} tone="danger" icon="💸" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.entries(bucketSums).map(([k, v]) => (
          <StatCard key={k} label={`Yaş: ${k}`} value={money(v, true)} tone={k === '3+ ay' ? 'danger' : k === '1–3 ay' ? 'warning' : 'default'} />
        ))}
      </div>

      <Card title="Borçlu Daireler">
        {debtors.length === 0 ? <EmptyState>Borçlu daire yok 🎉</EmptyState> : (
          <Table>
            <thead><tr><Th>Daire</Th><Th className="text-right">Anapara</Th><Th className="text-right">Gecikme</Th><Th className="text-right">Toplam</Th><Th>En Eski Açık</Th><Th>Yaş</Th></tr></thead>
            <tbody>
              {debtors.map((d) => (
                <tr key={d.unit_id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-700">{d.label}</Td>
                  <Td className="text-right text-slate-600">{money(Number(d.kalan_anapara ?? 0), true)}</Td>
                  <Td className="text-right text-amber-600">{money(Number(d.kalan_gecikme ?? 0), true)}</Td>
                  <Td className="text-right font-semibold text-red-600">{money(Number(d.toplam_borc ?? 0), true)}</Td>
                  <Td className="text-slate-500">{d.oldestLabel}</Td>
                  <Td><Badge tone={d.bucket.tone}>{d.bucket.label}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
