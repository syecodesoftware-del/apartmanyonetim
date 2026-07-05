import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { UnitDetailPanel } from '@/components/UnitDetailPanel';

export const dynamic = 'force-dynamic';

export default async function UnitDetailPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  await requireManager();
  const sb = await supabaseServer();

  const { data: unit } = await sb
    .from('units')
    .select('id, site_id, block, apartment_number, floor')
    .eq('id', unitId)
    .maybeSingle();
  if (!unit) notFound();

  const [{ data: tenancies }, { data: balance }, { data: residents }, { data: ledger }] = await Promise.all([
    sb
      .from('tenancies')
      .select('id, user_id, relationship, full_name, phone, tc_kimlik, start_date, end_date')
      .eq('unit_id', unitId)
      .order('end_date', { ascending: true, nullsFirst: true })
      .order('start_date', { ascending: false }),
    sb
      .from('unit_balances')
      .select('toplam_borc, kalan_anapara, kalan_gecikme')
      .eq('unit_id', unitId)
      .maybeSingle(),
    sb
      .from('users')
      .select('id, full_name, phone, tc_kimlik')
      .eq('site_id', unit.site_id)
      .eq('approval_status', 'approved')
      .order('full_name', { ascending: true }),
    sb
      .from('unit_ledger')
      .select('id, tarih, tur, aciklama, borc, odeme, durum, sirala')
      .eq('unit_id', unitId)
      .order('sirala', { ascending: true }),
  ]);

  const unitLabel = [unit.block, unit.apartment_number].filter(Boolean).join(' / ') || 'Daire';

  return (
    <>
      <PageHeader
        title={`Daire — ${unitLabel}`}
        subtitle={unit.floor != null ? `Kat ${unit.floor}` : undefined}
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
        unitId={unit.id}
        unitLabel={unitLabel}
        tenancies={tenancies ?? []}
        totalDebt={Number(balance?.toplam_borc ?? 0)}
        kalanAnapara={Number(balance?.kalan_anapara ?? 0)}
        kalanGecikme={Number(balance?.kalan_gecikme ?? 0)}
        ledger={ledger ?? []}
        residents={residents ?? []}
      />
    </>
  );
}
