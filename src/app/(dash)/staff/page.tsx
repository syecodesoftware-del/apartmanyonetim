import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { StaffPanel, type StaffMember } from '@/components/StaffPanel';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb.rpc('get_staff', { p_include_inactive: false });

  return (
    <>
      <PageHeader
        title="Personel"
        subtitle="Site personelini (kapıcı, güvenlik, temizlik, teknik) tek yerde yönetin"
      />
      <StaffPanel staff={(data ?? []) as unknown as StaffMember[]} />
    </>
  );
}
