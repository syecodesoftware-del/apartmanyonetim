import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { InventoryPanel, type Asset, type InspectionDue } from '@/components/InventoryPanel';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: assets }, { data: due }] = await Promise.all([
    sb.rpc('get_assets', { p_category: undefined }),
    sb.rpc('get_inspection_due', { p_within_days: 60 }),
  ]);

  return (
    <>
      <PageHeader
        title="Demirbaş & Envanter"
        subtitle="Site demirbaşlarını takip edin — asansör, jeneratör, yangın ekipmanı; periyodik muayene tarihleri hatırlatılır"
      />
      <InventoryPanel
        siteName={manager.siteName}
        assets={(assets ?? []) as unknown as Asset[]}
        due={(due ?? []) as unknown as InspectionDue[]}
      />
    </>
  );
}
