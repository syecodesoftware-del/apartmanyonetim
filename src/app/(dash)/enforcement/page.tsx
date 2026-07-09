import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { EnforcementPanel, type EnforcementCase, type DebtorUnit } from '@/components/EnforcementPanel';

export const dynamic = 'force-dynamic';

export default async function EnforcementPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: cases }, { data: debtors }] = await Promise.all([
    sb.rpc('get_enforcement_cases', { p_include_closed: false }),
    sb.from('unit_balances').select('unit_id, block, apartment_number, net_borc').eq('site_id', manager.siteId).gt('net_borc', 0).order('apartment_number'),
  ]);

  return (
    <>
      <PageHeader
        title="Takip & İcra"
        subtitle="Borçlu dairelerin hukuki takip / icra dosyalarını yönetin — güncel borç anlık hesaplanır"
      />
      <EnforcementPanel
        cases={(cases ?? []) as EnforcementCase[]}
        debtors={(debtors ?? []) as DebtorUnit[]}
      />
    </>
  );
}
