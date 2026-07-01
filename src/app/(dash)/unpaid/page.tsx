import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { UnpaidList, type UnpaidRow } from '@/components/UnpaidList';

export const dynamic = 'force-dynamic';

export default async function UnpaidPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  const [{ data: residents }, { data: owing }] = await Promise.all([
    sb.from('users').select('id, full_name, block, apartment_number, phone')
      .eq('site_id', manager.siteId).in('role', ['resident', 'manager']).eq('approval_status', 'approved')
      .order('full_name'),
    sb.from('accruals').select('debtor_user_id')
      .eq('site_id', manager.siteId).in('status', ['open', 'partial'])
      .eq('period_month', month).eq('period_year', year),
  ]);

  const owingIds = new Set((owing ?? []).map((a) => a.debtor_user_id));
  const unpaid = ((residents ?? []) as UnpaidRow[]).filter((r) => owingIds.has(r.id));

  return (
    <>
      <PageHeader title="Ödemeyenler" subtitle={`${monthLabel} · bu ay açık/kısmi tahakkuğu olanlar`} />
      <UnpaidList unpaid={unpaid} siteId={manager.siteId} />
    </>
  );
}
