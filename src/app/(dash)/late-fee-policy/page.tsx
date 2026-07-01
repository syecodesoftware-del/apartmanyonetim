import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { LateFeePolicyForm } from '@/components/LateFeePolicyForm';

export const dynamic = 'force-dynamic';

export default async function LateFeePolicyPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('late_fee_policies')
    .select('grace_days, hesaplama_modu')
    .eq('site_id', manager.siteId)
    .maybeSingle();

  return (
    <>
      <PageHeader title="Gecikme Politikası" subtitle="KMK m.20 — gecikme tazminatı oranı (sabit %5) ve hesaplama modu." />
      <LateFeePolicyForm
        siteId={manager.siteId}
        initialGrace={data?.grace_days ?? 0}
        initialMode={(data?.hesaplama_modu as 'aylik' | 'gunluk_bilesik') ?? 'aylik'}
      />
    </>
  );
}
