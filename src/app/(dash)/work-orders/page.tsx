import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { WorkOrdersPanel, type WorkOrder, type SiteUser, type OpenComplaint, type AccountOption } from '@/components/WorkOrdersPanel';

export const dynamic = 'force-dynamic';

export default async function WorkOrdersPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: orders }, { data: users }, { data: complaints }, { data: accounts }] = await Promise.all([
    sb.rpc('get_work_orders', { p_status: undefined }),
    sb.from('users').select('id, full_name, role').eq('site_id', manager.siteId).in('role', ['manager', 'admin', 'accountant', 'staff']).order('full_name'),
    sb.from('complaints').select('id, title, status, created_at').eq('site_id', manager.siteId).neq('status', 'resolved').order('created_at', { ascending: false }).limit(50),
    sb.from('cash_accounts').select('id, ad, tur').eq('site_id', manager.siteId).eq('is_active', true).order('created_at', { ascending: true }),
  ]);

  return (
    <>
      <PageHeader
        title="İş Takibi"
        subtitle="Arıza, bakım, dilek ve şikayet taleplerini takip edin — görevli atayın, maliyet girin, durumu yönetin"
      />
      <WorkOrdersPanel
        siteId={manager.siteId}
        orders={(orders ?? []) as WorkOrder[]}
        users={(users ?? []) as SiteUser[]}
        complaints={(complaints ?? []) as OpenComplaint[]}
        accounts={(accounts ?? []) as AccountOption[]}
      />
    </>
  );
}
