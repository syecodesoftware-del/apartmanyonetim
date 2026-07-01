import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { UnitsPanel, type UnitRow, type BlockOption } from '@/components/UnitsPanel';

export const dynamic = 'force-dynamic';

export default async function UnitsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [unitsRes, blocksRes] = await Promise.all([
    sb.from('units').select('id, block, apartment_number, floor, arsa_payi, m2, ada_id')
      .eq('site_id', manager.siteId)
      .order('block', { ascending: true }).order('apartment_number', { ascending: true }),
    sb.from('blocks').select('id, name').eq('site_id', manager.siteId).order('name', { ascending: true }),
  ]);

  const units = (unitsRes.data ?? []) as UnitRow[];
  const blockOptions = (blocksRes.data ?? []) as BlockOption[];

  return (
    <>
      <PageHeader title="Daireler" subtitle={`${units.length} daire`} />
      <UnitsPanel units={units} blockOptions={blockOptions} siteId={manager.siteId} />
    </>
  );
}
