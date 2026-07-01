import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { ChargeTypesPanel, type ChargeTypeRow } from '@/components/ChargeTypesPanel';

export const dynamic = 'force-dynamic';

export default async function ChargeTypesPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('charge_types')
    .select('id, ad, borc_hedefi, gecikme_uygula, is_icra, is_active')
    .eq('site_id', manager.siteId)
    .order('ad');

  const chargeTypes = (data ?? []) as ChargeTypeRow[];

  return (
    <>
      <PageHeader title="Gider Türleri" subtitle="Aidat, yakıt, demirbaş gibi tahakkuk kalemleri" />
      <ChargeTypesPanel chargeTypes={chargeTypes} siteId={manager.siteId} />
    </>
  );
}
