import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, Card } from '@/components/ui';
import { ApprovalsList, type PendingRow } from '@/components/ApprovalsList';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('users')
    .select('id, full_name, apartment_number, block, phone, email, tc_kimlik, role, created_at')
    .eq('site_id', manager.siteId)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  const pending = (data ?? []) as PendingRow[];

  return (
    <>
      <PageHeader title="Onay Bekleyenler" subtitle={`${pending.length} başvuru`} />
      <Card>
        <ApprovalsList pending={pending} />
      </Card>
    </>
  );
}
