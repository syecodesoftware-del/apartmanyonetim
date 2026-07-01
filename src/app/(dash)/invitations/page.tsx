import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { InvitationsPanel, type InvitationRow } from '@/components/InvitationsPanel';

export const dynamic = 'force-dynamic';

export default async function InvitationsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('site_invitations')
    .select('id, full_name, tc_kimlik, block, apartment_number, phone, email, role, status, token, created_at')
    .eq('site_id', manager.siteId)
    .order('created_at', { ascending: false });

  const invitations = (data ?? []) as InvitationRow[];

  return (
    <>
      <PageHeader title="Davetler" subtitle="T.C. ile önceden tanımlanan kişi, uygulamaya kayıt olduğunda onay beklemeden otomatik aktifleşir." />
      <InvitationsPanel invitations={invitations} siteId={manager.siteId} managerId={manager.userId} />
    </>
  );
}
