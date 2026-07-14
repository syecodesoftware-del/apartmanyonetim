import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { AccrualsForm, type ChargeOption, type UnitOption, type BatchRow } from '@/components/AccrualsForm';

export const dynamic = 'force-dynamic';

export default async function AccrualsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data }, { data: unitRows }, { data: batchRows }, { data: planRows }] = await Promise.all([
    sb.from('charge_types')
      .select('id, ad, is_active, borc_hedefi')
      .eq('site_id', manager.siteId)
      .eq('is_active', true)
      .order('ad'),
    sb.from('units')
      .select('id, block, apartment_number, arsa_payi')
      .eq('site_id', manager.siteId)
      .order('block')
      .order('apartment_number'),
    sb.rpc('get_accrual_batches', { p_limit: 8 }),
    sb.from('dues_plans').select('name, amount').eq('site_id', manager.siteId).eq('is_active', true),
  ]);

  const chargeTypes = (data ?? []) as ChargeOption[];
  const units = (unitRows ?? []) as UnitOption[];
  const batches = (batchRows ?? []) as BatchRow[];
  const activePlans = (planRows ?? []) as { name: string; amount: number }[];

  return (
    <>
      <PageHeader title="Borç Tahakkuku" subtitle="Borç daireye kaydedilir; borçlu tipi (kiracı / mülk sahibi) her tahakkukta seçilir." />
      <AccrualsForm chargeTypes={chargeTypes} units={units} siteId={manager.siteId} batches={batches} activePlans={activePlans} />
    </>
  );
}
