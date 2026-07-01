import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { AccrualsForm, type ChargeOption } from '@/components/AccrualsForm';

export const dynamic = 'force-dynamic';

export default async function AccrualsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('charge_types')
    .select('id, ad, is_active')
    .eq('site_id', manager.siteId)
    .eq('is_active', true)
    .order('ad');

  const chargeTypes = (data ?? []) as ChargeOption[];

  return (
    <>
      <PageHeader title="Aidat Tahakkuku" subtitle="Seçili gider türü için dönemsel borç oluşturur (cari defter)." />
      <AccrualsForm chargeTypes={chargeTypes} siteId={manager.siteId} />
    </>
  );
}
