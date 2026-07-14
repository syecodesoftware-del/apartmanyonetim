import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { StaffPanel, type StaffMember } from '@/components/StaffPanel';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data }, { data: accounts }] = await Promise.all([
    sb.rpc('get_staff', { p_include_inactive: false }),
    sb.from('cash_accounts').select('id, ad, tur').eq('site_id', manager.siteId).eq('is_active', true)
      .order('created_at', { ascending: true }),
  ]);

  return (
    <>
      <PageHeader
        title="Personel"
        subtitle="Site personelini (kapıcı, güvenlik, temizlik, teknik) tek yerde yönetin"
      />
      <StaffPanel
        staff={(data ?? []) as unknown as StaffMember[]}
        accounts={(accounts ?? []) as { id: string; ad: string; tur: string }[]}
      />
    </>
  );
}
