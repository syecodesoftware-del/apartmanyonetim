import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { SettingsPanel, type SiteInfo, type PendingMembership, type EligibleResident } from '@/components/SettingsPanel';
import { SiteDeletionCard, type DeletionRequest } from '@/components/SiteDeletionCard';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: site }, { data: memberships }, { data: residents }, { data: delReq }] = await Promise.all([
    sb.from('sites').select('id, name, district, city, apartment_count, site_code, settings').eq('id', manager.siteId).single(),
    sb.from('site_memberships').select('id, user_id, created_at, users(full_name)').eq('site_id', manager.siteId).eq('approval_status', 'pending'),
    sb.from('users').select('id, full_name, block, apartment_number').eq('site_id', manager.siteId).eq('role', 'resident').eq('approval_status', 'approved').order('full_name'),
    sb.from('site_deletion_requests').select('id, status, reason, created_at').eq('site_id', manager.siteId).eq('status', 'pending').maybeSingle(),
  ]);

  const siteInfo = (site ?? null) as SiteInfo | null;
  const pending: PendingMembership[] = (memberships ?? []).map((m) => ({
    id: m.id, user_id: m.user_id, created_at: m.created_at,
    full_name: (m.users as { full_name?: string } | null)?.full_name ?? '—',
  }));
  const eligible: EligibleResident[] = ((residents ?? []) as EligibleResident[]).filter((r) => r.id !== manager.userId);

  return (
    <>
      <PageHeader title="Ayarlar" subtitle="Site bilgileri, özellikler, üyelik talepleri ve yöneticilik devri" />
      <SettingsPanel site={siteInfo} pending={pending} eligible={eligible} />
      {!manager.readOnly && (
        <div className="mt-6">
          <SiteDeletionCard pending={(delReq ?? null) as DeletionRequest} />
        </div>
      )}
    </>
  );
}
