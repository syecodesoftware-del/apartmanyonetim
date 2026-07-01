import Link from 'next/link';
import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { WaiveControls } from '@/components/WaiveControls';
import { money, date } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TUR_LABEL: Record<string, string> = {
  tahakkuk: 'Tahakkuk', gecikme: 'Gecikme', tahsilat: 'Tahsilat', late_fee: 'Gecikme', collection: 'Tahsilat', accrual: 'Tahakkuk',
};
const TUR_TONE: Record<string, 'blue' | 'amber' | 'green'> = {
  tahakkuk: 'blue', accrual: 'blue', gecikme: 'amber', late_fee: 'amber', tahsilat: 'green', collection: 'green',
};

export default async function UnitStatementPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  await requireManager();
  const sb = await supabaseServer();

  const [{ data: unit }, { data: ledger }] = await Promise.all([
    sb.from('units').select('block, apartment_number').eq('id', unitId).maybeSingle(),
    sb.from('unit_ledger').select('id, tarih, tur, aciklama, borc, odeme, sirala, durum').eq('unit_id', unitId).order('sirala', { ascending: true }),
  ]);

  // Yürüyen bakiye (eskiden yeniye), sonra ekranda en yeni üstte
  let running = 0;
  const rows = (ledger ?? []).map((r) => {
    running += (r.borc ?? 0) - (r.odeme ?? 0);
    return { ...r, bakiye: running };
  });
  rows.reverse();
  const unitLabel = unit ? [unit.block, unit.apartment_number].filter(Boolean).join(' / ') || 'Daire' : 'Daire';

  return (
    <>
      <PageHeader
        title={`Cari Ekstre — ${unitLabel}`}
        subtitle={`Güncel bakiye: ${money(running, true)}`}
        action={<Link href="/balances" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">← Borç & Tahsilat</Link>}
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState>Bu daire için cari hareket yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr><Th>Tarih</Th><Th>Tür</Th><Th>Açıklama</Th><Th className="text-right">Borç</Th><Th className="text-right">Ödeme</Th><Th className="text-right">Bakiye</Th><Th className="text-right">İşlem</Th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td>{date(r.tarih)}</Td>
                  <Td>{r.tur ? <Badge tone={TUR_TONE[r.tur] ?? 'slate'}>{TUR_LABEL[r.tur] ?? r.tur}</Badge> : '—'}</Td>
                  <Td className="text-slate-600">
                    {r.aciklama ?? '—'}
                    {r.durum === 'waived' && <Badge tone="slate">Vazgeçildi</Badge>}
                  </Td>
                  <Td className={`text-right ${r.durum === 'waived' ? 'text-slate-400 line-through' : ''}`}>{r.borc ? money(r.borc, true) : '—'}</Td>
                  <Td className="text-right text-emerald-700">{r.odeme ? money(r.odeme, true) : '—'}</Td>
                  <Td className={`text-right font-semibold ${r.bakiye > 0.005 ? 'text-red-600' : 'text-slate-700'}`}>{money(r.bakiye, true)}</Td>
                  <Td className="text-right">{r.tur === 'tahakkuk' && r.id ? <WaiveControls accrualId={r.id} durum={r.durum} /> : null}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
