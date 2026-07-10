import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { MembershipPanel, type PendingRow, type InvitationRow } from '@/components/MembershipPanel';
import type { InviteCandidate } from '@/components/BulkInviteModal';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ davet?: string }> }) {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const { davet } = await searchParams;

  const [{ data: pendingRows }, { data: invitationRows }, { data: candidateRows }] = await Promise.all([
    sb.from('users')
      .select('id, full_name, apartment_number, block, phone, email, tc_kimlik, role, created_at')
      .eq('site_id', manager.siteId)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false }),
    sb.from('site_invitations')
      .select('id, full_name, tc_kimlik, block, apartment_number, phone, email, role, status, token, created_at')
      .eq('site_id', manager.siteId)
      .order('created_at', { ascending: false }),
    // Toplu davet adayları: Excel aktarımından gelen, henüz hesabı olmayan güncel sakinler
    sb.from('tenancies')
      .select('id, full_name, phone, tc_kimlik, relationship, units(block, apartment_number)')
      .eq('site_id', manager.siteId)
      .is('end_date', null)
      .is('user_id', null)
      .order('full_name', { ascending: true }),
  ]);

  const pending = (pendingRows ?? []) as PendingRow[];
  const invitations = (invitationRows ?? []) as InvitationRow[];
  type CandidateRaw = {
    id: string; full_name: string; phone: string | null; tc_kimlik: string | null; relationship: string;
    units: { block: string | null; apartment_number: string } | null;
  };
  const candidates: InviteCandidate[] = ((candidateRows ?? []) as unknown as CandidateRaw[]).map((t) => ({
    id: t.id,
    full_name: t.full_name,
    phone: t.phone,
    tc_kimlik: t.tc_kimlik,
    relationship: t.relationship,
    block: t.units?.block ?? null,
    apartment_number: t.units?.apartment_number ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Başvurular & Davetler"
        subtitle="Kendisi başvuranı onaylayın/reddedin; davet ettiğiniz kişi kayıt olduğunda otomatik aktifleşir."
      />
      <MembershipPanel
        pending={pending}
        invitations={invitations}
        candidates={candidates}
        siteId={manager.siteId}
        managerId={manager.userId}
        autoOpenInvite={davet === '1'}
      />
    </>
  );
}
