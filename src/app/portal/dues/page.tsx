import { requireResident } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { Card, StatCard, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { money, date } from '@/lib/format';

export const dynamic = 'force-dynamic';

const MONTHS = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

type Accrual = {
  id: string;
  period_month: number;
  period_year: number;
  amount: number;
  principal_remaining: number;
  status: string;
  due_date: string | null;
  charge_types: { ad: string | null } | null;
};

export default async function PortalDues() {
  const resident = await requireResident();
  const sb = await supabaseServer();

  const [{ data }, { data: sharedRaw }] = await Promise.all([
    sb.from('accruals')
      .select('id, period_month, period_year, amount, principal_remaining, status, due_date, charge_types(ad)')
      .eq('debtor_user_id', resident.userId)
      .eq('site_id', resident.siteId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false }),
    sb.rpc('get_unit_shared_debt'),
  ]);

  const rows = (data ?? []) as unknown as Accrual[];
  const shared = (sharedRaw ?? null) as {
    has_unit?: boolean; unit_label?: string; my_relationship?: string;
    unit_open_total?: number; other_open?: number;
  } | null;
  const otherOpen = shared?.has_unit ? Number(shared.other_open ?? 0) : 0;
  const totalDebt = rows.filter((r) => r.status === 'open').reduce((a, r) => a + Number(r.principal_remaining ?? 0), 0);
  const totalBilled = rows.reduce((a, r) => a + Number(r.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Güncel Borç" value={money(totalDebt, true)} tone={totalDebt > 0 ? 'danger' : 'success'} />
        <StatCard label="Toplam Tahakkuk" value={money(totalBilled, true)} />
      </div>

      {otherOpen > 0.005 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            🏠 Daire Ortak Borcu · {shared?.unit_label} — {money(Number(shared?.unit_open_total), true)}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Bu borcun {money(otherOpen, true)} kadarı size değil, dairenizin diğer sakinine/ortak borca aittir.
            {shared?.my_relationship === 'malik' ? ' Malik olarak dairenizin borcundan sorumlusunuz.' : ''}
          </p>
        </div>
      )}

      <Card title="Aidat / Gider Dökümü">
        {rows.length === 0 ? (
          <EmptyState>Adınıza kayıtlı tahakkuk bulunmuyor.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Dönem</Th>
                  <Th>Tür</Th>
                  <Th>Vade</Th>
                  <Th className="text-right">Tutar</Th>
                  <Th className="text-right">Kalan</Th>
                  <Th>Durum</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const paid = r.status === 'paid' || Number(r.principal_remaining) <= 0;
                  const partial = !paid && Number(r.principal_remaining) < Number(r.amount);
                  return (
                    <tr key={r.id}>
                      <Td>{MONTHS[r.period_month] ?? r.period_month} {r.period_year}</Td>
                      <Td>{r.charge_types?.ad ?? '—'}</Td>
                      <Td className="text-slate-500">{r.due_date ? date(r.due_date) : '—'}</Td>
                      <Td className="text-right tabular-nums">{money(Number(r.amount), true)}</Td>
                      <Td className={`text-right tabular-nums ${!paid ? 'text-red-600 font-medium' : ''}`}>{money(Number(r.principal_remaining), true)}</Td>
                      <Td>{paid ? <Badge tone="green">Ödendi</Badge> : partial ? <Badge tone="amber">Kısmi</Badge> : <Badge tone="red">Ödenmedi</Badge>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-slate-400">
        Ödemelerinizle ilgili sorularınız için site yönetimine başvurabilirsiniz.
      </p>
    </div>
  );
}
