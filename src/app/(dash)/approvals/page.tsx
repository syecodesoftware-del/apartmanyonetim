import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { MembershipPanel, type PendingRow, type InvitationRow } from '@/components/MembershipPanel';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ davet?: string }> }) {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const { davet } = await searchParams;

  const [{ data: pendingRows }, { data: invitationRows }] = await Promise.all([
    sb.from('users')
      .select('id, full_name, apartment_number, block, phone, email, tc_kimlik, role, created_at')
      .eq('site_id', manager.siteId)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false }),
    sb.from('site_invitations')
      .select('id, full_name, tc_kimlik, block, apartment_number, phone, email, role, status, token, created_at')
      .eq('site_id', manager.siteId)
      .order('created_at', { ascending: false }),
  ]);

  const pending = (pendingRows ?? []) as PendingRow[];
  const invitations = (invitationRows ?? []) as InvitationRow[];

  return (
    <>
      <PageHeader
        title="Başvurular & Davetler"
        subtitle="Kendisi başvuranı onaylayın/reddedin; davet ettiğiniz kişi kayıt olduğunda otomatik aktifleşir."
      />
      <MembershipPanel
        pending={pending}
        invitations={invitations}
        siteId={manager.siteId}
        managerId={manager.userId}
        autoOpenInvite={davet === '1'}
      />
    </>
  );
}
