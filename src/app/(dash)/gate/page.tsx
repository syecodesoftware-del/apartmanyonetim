import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { GatePanel, type VisitorPass, type PackageRow, type UnitRow, type SiteUserRow } from '@/components/GatePanel';

export const dynamic = 'force-dynamic';

export default async function GatePage() {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const canManageGate = !manager.readOnly && (manager.role === 'manager' || manager.role === 'admin');

  const [{ data: visitors }, { data: packages }, { data: units }, { data: siteUsers }] = await Promise.all([
    sb.rpc('get_visitor_passes', { p_date: undefined, p_status: undefined }),
    sb.rpc('get_packages', { p_status: undefined }),
    sb.from('units').select('id, block, apartment_number').eq('site_id', manager.siteId).order('block').order('apartment_number'),
    canManageGate
      ? sb.from('users').select('id, full_name, role, block, apartment_number')
          .eq('site_id', manager.siteId).eq('approval_status', 'approved')
          .in('role', ['resident', 'gorevli']).order('full_name')
      : Promise.resolve({ data: [] as SiteUserRow[] }),
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
        siteUsers={(siteUsers ?? []) as SiteUserRow[]}
        canManageGate={canManageGate}
      />
    </>
  );
}
