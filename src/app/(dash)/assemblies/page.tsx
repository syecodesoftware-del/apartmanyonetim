import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { AssembliesPanel, type AssemblyRow } from '@/components/AssembliesPanel';

export const dynamic = 'force-dynamic';

export default async function AssembliesPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb.rpc('get_assemblies');

  return (
    <>
      <PageHeader
        title="Genel Kurul"
        subtitle="Toplantı çağrısı, gündem, uzaktan oy ve tutanak — oy daire başına, yalnız kat maliki kullanır"
      />
      <AssembliesPanel
        canManage={manager.role === 'manager' || manager.role === 'admin'}
        assemblies={(data ?? []) as unknown as AssemblyRow[]}
      />
    </>
  );
}
