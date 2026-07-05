import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard, Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { ReportControls, type ExportSheet } from '@/components/ReportControls';
import { parseRange, toExclusive } from '@/lib/reports';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TUR_LABEL: Record<string, string> = { nakit: 'Nakit Kasa', banka: 'Banka' };

type AccBal = { cash_account_id: string; ad: string | null; tur: string | null; is_active: boolean | null; balance: number | null };

export default async function CashReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const { from, to } = parseRange(await searchParams);
  const toEx = toExclusive(to);

  const [{ data: balances }, { data: collections }, { data: expenses }] = await Promise.all([
    sb.from('cash_account_balances').select('cash_account_id, ad, tur, is_active, balance').eq('site_id', manager.siteId),
    sb.from('collections').select('cash_account_id, amount').eq('site_id', manager.siteId).gte('paid_at', from).lt('paid_at', toEx),
    sb.from('cash_expenses').select('cash_account_id, amount').eq('site_id', manager.siteId).gte('spent_at', from).lte('spent_at', to),
  ]);

  const inflow = new Map<string, number>();
  let unassignedIn = 0; // hesaba (kasa/banka) bağlanmamış tahsilatlar — ör. online/QR
  for (const c of collections ?? []) {
    if (!c.cash_account_id) { unassignedIn += Number(c.amount ?? 0); continue; }
    inflow.set(c.cash_account_id, (inflow.get(c.cash_account_id) ?? 0) + Number(c.amount ?? 0));
  }
  const outflow = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (!e.cash_account_id) continue;
    outflow.set(e.cash_account_id, (outflow.get(e.cash_account_id) ?? 0) + Number(e.amount ?? 0));
  }

  const accounts = ((balances ?? []) as AccBal[]).map((a) => ({
    ...a,
    label: a.ad ?? 'Hesap',
    inflow: inflow.get(a.cash_account_id) ?? 0,
    outflow: outflow.get(a.cash_account_id) ?? 0,
  })).sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0));

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const accountIn = accounts.reduce((s, a) => s + a.inflow, 0);
  const totalIn = accountIn + unassignedIn; // Gelir–Gider "Toplam Gelir" ile uzlaşır
  const totalOut = accounts.reduce((s, a) => s + a.outflow, 0);

  const sheets: ExportSheet[] = [
    { name: 'Hesap Durumu', rows: [
      ...accounts.map((a) => ({
        'Hesap': a.label, 'Tür': TUR_LABEL[a.tur ?? ''] ?? a.tur, 'Aktif': a.is_active ? 'Evet' : 'Hayır',
        'Dönem Giriş': a.inflow, 'Dönem Çıkış': a.outflow, 'Güncel Bakiye': Number(a.balance ?? 0),
      })),
      ...(unassignedIn > 0.005 ? [{
        'Hesap': 'Hesaba bağlanmamış', 'Tür': '—', 'Aktif': '—',
        'Dönem Giriş': unassignedIn, 'Dönem Çıkış': 0, 'Güncel Bakiye': 0,
      }] : []),
    ] },
    { name: 'Özet', rows: [{ 'Başlangıç': from, 'Bitiş': to, 'Toplam Giriş': totalIn, 'Hesap Girişi': accountIn, 'Hesaba Bağlanmamış': unassignedIn, 'Toplam Çıkış': totalOut, 'Toplam Bakiye': totalBalance }] },
  ];

  return (
    <>
      <PageHeader title="Kasa & Banka Durumu" subtitle={`Bakiye anlık · hareketler ${from} — ${to}`} />
      <ReportControls from={from} to={to} sheets={sheets} fileName={`kasa-banka-${from}_${to}.xlsx`} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Dönem Giriş" value={money(totalIn, true)} hint={unassignedIn > 0.005 ? `${money(unassignedIn, true)} hesaba bağlanmamış` : undefined} tone="success" icon="⬇️" />
        <StatCard label="Dönem Çıkış" value={money(totalOut, true)} tone="danger" icon="⬆️" />
        <StatCard label="Toplam Bakiye" value={money(totalBalance, true)} icon="🏦" />
      </div>

      <Card title="Hesaplar">
        {accounts.length === 0 ? <EmptyState>Kasa/banka hesabı yok.</EmptyState> : (
          <Table>
            <thead><tr><Th>Hesap</Th><Th>Tür</Th><Th className="text-right">Dönem Giriş</Th><Th className="text-right">Dönem Çıkış</Th><Th className="text-right">Güncel Bakiye</Th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.cash_account_id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-700">{a.label} {!a.is_active && <Badge tone="slate">Pasif</Badge>}</Td>
                  <Td className="text-slate-500">{TUR_LABEL[a.tur ?? ''] ?? a.tur}</Td>
                  <Td className="text-right text-emerald-600">{money(a.inflow, true)}</Td>
                  <Td className="text-right text-red-600">{money(a.outflow, true)}</Td>
                  <Td className="text-right font-semibold text-slate-800">{money(Number(a.balance ?? 0), true)}</Td>
                </tr>
              ))}
              {unassignedIn > 0.005 && (
                <tr className="border-l-2 border-amber-400 bg-amber-50/40">
                  <Td className="font-medium text-amber-700">Hesaba bağlanmamış <Badge tone="amber">online/QR</Badge></Td>
                  <Td className="text-slate-400">—</Td>
                  <Td className="text-right font-semibold text-emerald-600">{money(unassignedIn, true)}</Td>
                  <Td className="text-right text-slate-400">—</Td>
                  <Td className="text-right text-slate-400">—</Td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
        {unassignedIn > 0.005 && (
          <p className="mt-3 text-xs text-amber-600">
            ⚠ {money(unassignedIn, true)} tutarındaki tahsilat bir kasa/banka hesabına bağlanmamış (ör. online/QR). Bu tutar
            “Dönem Giriş” toplamına dahildir ancak hiçbir hesap bakiyesine yansımaz — bir hesaba eşleştirmeniz önerilir.
          </p>
        )}
      </Card>
    </>
  );
}
