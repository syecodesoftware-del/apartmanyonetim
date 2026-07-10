import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireManager } from '@/lib/session';
import { getUnitDetailData } from '@/lib/unitDetail';
import { PageHeader } from '@/components/ui';
import { UnitDetailPanel } from '@/components/UnitDetailPanel';

export const dynamic = 'force-dynamic';

export default async function UnitDetailPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  await requireManager();

  const data = await getUnitDetailData(unitId);
  if (!data) notFound();

  return (
    <>
      <PageHeader
        title={`Daire — ${data.unitLabel}`}
        subtitle={data.unit.floor != null ? `Kat ${data.unit.floor}` : undefined}
        action={
          <Link
            href="/units"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            ← Daireler
          </Link>
        }
      />
      <UnitDetailPanel
        unitId={data.unit.id}
        siteId={data.unit.site_id}
        unitLabel={data.unitLabel}
        tenancies={data.tenancies}
        totalDebt={data.totalDebt}
        kalanAnapara={data.kalanAnapara}
        kalanGecikme={data.kalanGecikme}
        ledger={data.ledger}
        residents={data.residents}
      />
    </>
  );
}
