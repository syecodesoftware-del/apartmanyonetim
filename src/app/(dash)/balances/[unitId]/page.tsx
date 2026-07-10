import { redirect } from 'next/navigation';

/** Daire 360 birleşimi: cari ekstre artık daire kartının içinde (Vazgeç dahil). */
export default async function UnitStatementPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  redirect(`/units/${unitId}`);
}
