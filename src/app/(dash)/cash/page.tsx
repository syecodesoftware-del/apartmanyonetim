import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { CashPanel, type AccountBalance, type Movement } from '@/components/CashPanel';

export const dynamic = 'force-dynamic';

export default async function CashPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [balRes, movRes] = await Promise.all([
    sb.from('cash_account_balances').select('cash_account_id, ad, tur, is_active, balance').eq('site_id', manager.siteId).order('ad'),
    sb.from('cash_movements').select('id, cash_account_id, yon, amount, hareket_tarihi, tur, detay, kaynak').eq('site_id', manager.siteId).order('sirala', { ascending: false }).limit(100),
  ]);

  const balances = (balRes.data ?? []) as AccountBalance[];
  const movements = (movRes.data ?? []) as Movement[];

  return (
    <>
      <PageHeader title="Kasa & Banka" subtitle="Kasa/banka hesapları, bakiyeler, gider girişi ve hareket ekstresi" />
      <CashPanel balances={balances} movements={movements} siteId={manager.siteId} managerId={manager.userId} />
    </>
  );
}
