import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { GatePanel, type VisitorPass, type PackageRow, type UnitRow } from '@/components/GatePanel';

export const dynamic = 'force-dynamic';

export default async function GatePage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: visitors }, { data: packages }, { data: units }] = await Promise.all([
    sb.rpc('get_visitor_passes', { p_date: undefined, p_status: undefined }),
    sb.rpc('get_packages', { p_status: undefined }),
    sb.from('units').select('id, block, apartment_number').eq('site_id', manager.siteId).order('block').order('apartment_number'),
  ]);

  return (
    <>
      <PageHeader
        title="Kapı & Ziyaretçi"
        subtitle="Ziyaretçi kodu doğrulama, plaka sorgulama ve kargo takibi — kapı operasyonları tek ekranda"
      />
      <GatePanel
        visitors={(visitors ?? []) as unknown as VisitorPass[]}
        packages={(packages ?? []) as unknown as PackageRow[]}
        units={(units ?? []) as UnitRow[]}
      />
    </>
  );
}
