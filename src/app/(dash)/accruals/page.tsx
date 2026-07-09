import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { AccrualsForm, type ChargeOption, type UnitOption } from '@/components/AccrualsForm';

export const dynamic = 'force-dynamic';

export default async function AccrualsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data }, { data: unitRows }] = await Promise.all([
    sb.from('charge_types')
      .select('id, ad, is_active, borc_hedefi')
      .eq('site_id', manager.siteId)
      .eq('is_active', true)
      .order('ad'),
    sb.from('units')
      .select('id, block, apartment_number')
      .eq('site_id', manager.siteId)
      .order('block')
      .order('apartment_number'),
  ]);

  const chargeTypes = (data ?? []) as ChargeOption[];
  const units = (unitRows ?? []) as UnitOption[];

  return (
    <>
      <PageHeader title="Borç Tahakkuku" subtitle="Borç daireye kaydedilir; borçlu tipi (kiracı / mülk sahibi) her tahakkukta seçilir." />
      <AccrualsForm chargeTypes={chargeTypes} units={units} siteId={manager.siteId} />
    </>
  );
}
