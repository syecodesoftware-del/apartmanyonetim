import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { DuesPlansPanel, type DuesPlanRow } from '@/components/DuesPlansPanel';

export const dynamic = 'force-dynamic';

export default async function DuesPlansPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('dues_plans')
    .select('id, name, amount, due_day, description, is_active')
    .eq('site_id', manager.siteId)
    .order('created_at', { ascending: false });

  const plans = (data ?? []) as DuesPlanRow[];

  return (
    <>
      <PageHeader title="Aidat Planları" subtitle="Sabit aylık aidat planı tanımları (dönemsel borç için Tahakkuk ekranını kullanın)." />
      <DuesPlansPanel plans={plans} siteId={manager.siteId} managerId={manager.userId} />
    </>
  );
}
