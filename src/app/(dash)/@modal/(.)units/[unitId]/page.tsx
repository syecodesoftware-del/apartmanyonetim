import { requireManager } from '@/lib/session';
import { getUnitDetailData } from '@/lib/unitDetail';
import { RouteModal } from '@/components/RouteModal';
import { UnitDetailPanel } from '@/components/UnitDetailPanel';

export const dynamic = 'force-dynamic';

/** /units listesinden tıklanınca daire detayı popup olarak açılır; URL /units/[unitId] kalır. */
export default async function UnitDetailModal({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  await requireManager();

  const data = await getUnitDetailData(unitId);
  if (!data) return null;

  return (
    <RouteModal
      title={`Daire — ${data.unitLabel}`}
      subtitle={data.unit.floor != null ? `Kat ${data.unit.floor}` : undefined}
      fullHref={`/units/${data.unit.id}`}
    >
      <UnitDetailPanel
        unitId={data.unit.id}
        unitLabel={data.unitLabel}
        tenancies={data.tenancies}
        totalDebt={data.totalDebt}
        kalanAnapara={data.kalanAnapara}
        kalanGecikme={data.kalanGecikme}
        ledger={data.ledger}
        residents={data.residents}
      />
    </RouteModal>
  );
}
