import Link from 'next/link';
import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard } from '@/components/ui';
import { ReconcilePanel, type Txn, type Summary, type UnitOption } from '@/components/ReconcilePanel';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ReconcilePage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: account }, { data: summary }, { data: txns }, { data: units }] = await Promise.all([
    sb.from('cash_accounts').select('ad, tur, iban').eq('id', accountId).maybeSingle(),
    sb.from('bank_reconciliation').select('*').eq('cash_account_id', accountId).maybeSingle(),
    sb.from('bank_transactions').select('id, txn_date, direction, amount, description, counterparty, bank_ref, match_status').eq('cash_account_id', accountId).order('txn_date', { ascending: false }).limit(200),
    sb.from('units').select('id, block, apartment_number').eq('site_id', manager.siteId).order('apartment_number', { ascending: true }),
  ]);

  const s = (summary ?? null) as Summary | null;
  const transactions = (txns ?? []) as Txn[];
  const unitOptions = (units ?? []) as UnitOption[];
  const accLabel = account?.ad ?? 'Hesap';

  return (
    <>
      <PageHeader
        title={`Banka Mutabakatı — ${accLabel}`}
        subtitle={account?.iban ?? undefined}
        action={<Link href="/cash" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">← Kasa & Banka</Link>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Defter Bakiyesi" value={money(s?.defter_bakiye, true)} />
        <StatCard label="Banka Net" value={money(s?.banka_net, true)} />
        <StatCard label="Eşleşmeyen" value={s?.eslesmeyen_sayi ?? 0} tone={(s?.eslesmeyen_sayi ?? 0) > 0 ? 'warning' : 'success'} hint={money(s?.eslesmeyen_tutar, true)} />
        <StatCard label="Toplam Hareket" value={s?.toplam_hareket ?? transactions.length} />
      </div>

      <ReconcilePanel transactions={transactions} accountId={accountId} siteId={manager.siteId} managerId={manager.userId} units={unitOptions} />
    </>
  );
}
