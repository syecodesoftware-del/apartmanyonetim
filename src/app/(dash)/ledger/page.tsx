import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { LedgerPanel, type Ledger } from '@/components/LedgerPanel';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const year = new Date().getFullYear();
  const { data } = await sb.rpc('get_isletme_defteri', { p_year: year, p_month: undefined });

  return (
    <>
      <PageHeader
        title="İşletme Defteri"
        subtitle="KMK m.36 — dönemin tüm gelir ve giderleri kronolojik sırada; devir ve kapanış kasa bakiyeleriyle tutarlıdır"
      />
      <LedgerPanel siteName={manager.siteName} initialYear={year} initial={(data ?? null) as unknown as Ledger | null} />
    </>
  );
}
