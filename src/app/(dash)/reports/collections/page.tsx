import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard, Card, Table, Th, Td, EmptyState } from '@/components/ui';
import { ReportControls, type ExportSheet } from '@/components/ReportControls';
import { parseRange, toExclusive } from '@/lib/reports';
import { money, date } from '@/lib/format';

export const dynamic = 'force-dynamic';

const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', bank: 'Banka/Havale', online: 'Online', qr: 'QR' };

type Row = { id: string; amount: number; method: string | null; paid_at: string | null; units: { block: string | null; apartment_number: string } | null };

export default async function CollectionsReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const { from, to } = parseRange(await searchParams);
  const toEx = toExclusive(to);

  const { data } = await sb
    .from('collections')
    .select('id, amount, method, paid_at, units(block, apartment_number)')
    .eq('site_id', manager.siteId)
    .gte('paid_at', from).lt('paid_at', toEx)
    .order('paid_at', { ascending: false })
    .limit(2000);

  const rows = (data ?? []) as unknown as Row[];
  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const unitLabel = (r: Row) => (r.units ? [r.units.block, r.units.apartment_number].filter(Boolean).join(' / ') : '—');

  const detailRows = rows.map((r) => ({
    'Tarih': r.paid_at ? date(r.paid_at) : '—',
    'Daire': unitLabel(r),
    'Yöntem': METHOD_LABEL[r.method ?? 'cash'] ?? r.method,
    'Tutar': Number(r.amount ?? 0),
  }));

  const sheets: ExportSheet[] = [
    { name: 'Tahsilatlar', rows: detailRows },
    { name: 'Özet', rows: [{ 'Başlangıç': from, 'Bitiş': to, 'Kayıt': rows.length, 'Toplam': total }] },
  ];

  return (
    <>
      <PageHeader title="Tahsilat Raporu" subtitle={`${from} — ${to}`} />
      <ReportControls from={from} to={to} sheets={sheets} fileName={`tahsilat-${from}_${to}.xlsx`} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Tahsilat Adedi" value={rows.length} icon="💵" />
        <StatCard label="Toplam Tahsilat" value={money(total, true)} tone="success" icon="💰" />
      </div>

      <Card title="Tahsilat Dökümü">
        {rows.length === 0 ? <EmptyState>Bu aralıkta tahsilat kaydı yok.</EmptyState> : (
          <Table>
            <thead><tr><Th>Tarih</Th><Th>Daire</Th><Th>Yöntem</Th><Th className="text-right">Tutar</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td>{r.paid_at ? date(r.paid_at) : '—'}</Td>
                  <Td className="font-medium text-slate-700">{unitLabel(r)}</Td>
                  <Td className="text-slate-500">{METHOD_LABEL[r.method ?? 'cash'] ?? r.method}</Td>
                  <Td className="text-right font-semibold text-emerald-600">{money(Number(r.amount ?? 0), true)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
