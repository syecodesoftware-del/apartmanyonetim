import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { MetersPanel, type MeterRow, type UnitRow } from '@/components/MetersPanel';

export const dynamic = 'force-dynamic';

export default async function MetersPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: meters }, { data: units }] = await Promise.all([
    sb.rpc('get_meters', { p_kind: undefined }),
    sb.from('units').select('id, block, apartment_number').eq('site_id', manager.siteId).order('block').order('apartment_number'),
  ]);

  return (
    <>
      <PageHeader
        title="Sayaçlar"
        subtitle="Daire sayaçları ve dönemsel okumalar — tüketim otomatik hesaplanır, sakin kendi tüketimini uygulamadan görür"
      />
      <MetersPanel
        meters={(meters ?? []) as unknown as MeterRow[]}
        units={(units ?? []) as UnitRow[]}
      />
    </>
  );
}
