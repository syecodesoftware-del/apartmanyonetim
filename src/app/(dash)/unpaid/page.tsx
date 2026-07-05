import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { UnpaidList, type UnpaidRow } from '@/components/UnpaidList';

export const dynamic = 'force-dynamic';

export default async function UnpaidPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: residents }, { data: owing }] = await Promise.all([
    sb.from('users').select('id, full_name, block, apartment_number, phone')
      .eq('site_id', manager.siteId).in('role', ['resident', 'manager']).eq('approval_status', 'approved')
      .order('full_name'),
    // Birikmiş borç: hangi aya ait olursa olsun açık/kısmi tüm tahakkuklar
    sb.from('accruals').select('debtor_user_id')
      .eq('site_id', manager.siteId).in('status', ['open', 'partial']),
  ]);

  const owingIds = new Set((owing ?? []).map((a) => a.debtor_user_id));
  const unpaid = ((residents ?? []) as UnpaidRow[]).filter((r) => owingIds.has(r.id));

  return (
    <>
      <PageHeader title="Ödemeyenler" subtitle="Açık veya kısmi ödenmiş tahakkuğu olan sakinler" />
      <UnpaidList unpaid={unpaid} siteId={manager.siteId} />
    </>
  );
}
