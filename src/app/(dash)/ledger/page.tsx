import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { LedgerPanel, type Ledger } from '@/components/LedgerPanel';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const year = new Date().getFullYear();
  const [{ data }, { data: site }] = await Promise.all([
    sb.rpc('get_isletme_defteri', { p_year: year, p_month: undefined }),
    sb.from('sites').select('settings').eq('id', manager.siteId).maybeSingle(),
  ]);
  const lockedUntil = ((site?.settings as Record<string, unknown> | null)?.ledger_locked_until as string | undefined) ?? null;

  return (
    <>
      <PageHeader
        title="İşletme Defteri"
        subtitle="KMK m.36 — dönemin tüm gelir ve giderleri kronolojik sırada; devir ve kapanış kasa bakiyeleriyle tutarlıdır"
      />
      <LedgerPanel
        siteName={manager.siteName}
        siteId={manager.siteId}
        initialYear={year}
        initial={(data ?? null) as unknown as Ledger | null}
        lockedUntil={lockedUntil}
        canLock={!manager.readOnly && (manager.role === 'manager' || manager.role === 'admin')}
      />
    </>
  );
}
