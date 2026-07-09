import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { DecisionsPanel, type Decision } from '@/components/DecisionsPanel';

export const dynamic = 'force-dynamic';

export default async function DecisionsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb.rpc('get_board_decisions', { p_year: undefined });

  return (
    <>
      <PageHeader
        title="Karar Defteri"
        subtitle="Yönetim ve genel kurul kararları — yıl içinde otomatik sıra numarası, numara bütünlüğü korunur"
      />
      <DecisionsPanel
        siteName={manager.siteName}
        canManage={manager.role === 'manager' || manager.role === 'admin'}
        decisions={(data ?? []) as unknown as Decision[]}
      />
    </>
  );
}
