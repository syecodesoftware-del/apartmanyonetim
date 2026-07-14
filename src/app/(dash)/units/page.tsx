import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, StatCard } from '@/components/ui';
import { UnitsHub, type HubRow, type BlockOption, type Occupant, type AccountOption } from '@/components/UnitsHub';

export const dynamic = 'force-dynamic';

type OccRow = { unit_id: string; relationship: string; full_name: string; phone: string | null; has_account: boolean };
type BalRow = { unit_id: string | null; kalan_anapara: number | null; kalan_gecikme: number | null; toplam_borc: number | null; avans: number | null; net_borc: number | null };

/** Daire 360 — daire listesi + sakinler + borç/tahsilat tek ekranda. */
export default async function UnitsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const { f } = await searchParams;

  const [unitsRes, blocksRes, occRes, balRes, accRes] = await Promise.all([
    sb.from('units').select('id, block, apartment_number, floor, arsa_payi, m2, ada_id')
      .eq('site_id', manager.siteId)
      .order('block', { ascending: true }).order('apartment_number', { ascending: true }),
    sb.from('blocks').select('id, name').eq('site_id', manager.siteId).order('name', { ascending: true }),
    sb.from('current_occupants').select('unit_id, relationship, full_name, phone, has_account')
      .eq('site_id', manager.siteId),
    sb.from('unit_balances').select('unit_id, kalan_anapara, kalan_gecikme, toplam_borc, avans, net_borc')
      .eq('site_id', manager.siteId),
    sb.from('cash_accounts').select('id, ad, tur').eq('site_id', manager.siteId).eq('is_active', true)
      .order('created_at', { ascending: true }),
  ]);

  const occByUnit = new Map<string, { malik?: Occupant; kiraci?: Occupant }>();
  for (const o of (occRes.data ?? []) as OccRow[]) {
    const entry = occByUnit.get(o.unit_id) ?? {};
    const occ: Occupant = { full_name: o.full_name, phone: o.phone, has_account: o.has_account };
    if (o.relationship === 'malik') entry.malik = occ;
    else if (o.relationship === 'kiraci') entry.kiraci = occ;
    occByUnit.set(o.unit_id, entry);
  }
  const balByUnit = new Map<string, BalRow>();
  for (const b of (balRes.data ?? []) as BalRow[]) {
    if (b.unit_id) balByUnit.set(b.unit_id, b);
  }

  const rows: HubRow[] = (unitsRes.data ?? []).map((u) => {
    const occ = occByUnit.get(u.id) ?? {};
    const bal = balByUnit.get(u.id);
    const debt = Number(bal?.toplam_borc ?? 0);
    const advance = Number(bal?.avans ?? 0);
    return {
      ...u,
      malik: occ.malik ?? null,
      kiraci: occ.kiraci ?? null,
      toplam_borc: debt,
      avans: advance,
      net_borc: Number(bal?.net_borc ?? debt - advance),
    };
  });

  const blockOptions = (blocksRes.data ?? []) as BlockOption[];
  const totalDebt = rows.reduce((s, r) => s + r.toplam_borc, 0);
  const totalAdvance = rows.reduce((s, r) => s + r.avans, 0);
  const debtorCount = rows.filter((r) => r.net_borc > 0.005).length;
  const noAppCount = rows.filter((r) => (r.malik || r.kiraci) && !(r.malik?.has_account || r.kiraci?.has_account)).length;

  return (
    <>
      <PageHeader
        title="Daireler & Sakinler"
        subtitle="Daire, sakin, borç ve tahsilat tek ekranda — satıra tıklayınca daire kartı açılır"
      />
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Toplam Daire" value={rows.length} icon="🏠" />
        <StatCard label="Borçlu Daire" value={debtorCount} tone={debtorCount ? 'warning' : 'success'} icon="⏳" />
        <StatCard label="Toplam Açık Borç" value={`₺${Math.round(totalDebt).toLocaleString('tr-TR')}`} tone={totalDebt > 0 ? 'danger' : 'success'} icon="💰" />
        <StatCard label="Uygulaması Olmayan" value={noAppCount} hint={totalAdvance > 0.005 ? `Toplam avans ₺${Math.round(totalAdvance).toLocaleString('tr-TR')}` : undefined} icon="📱" />
      </div>
      <UnitsHub rows={rows} blockOptions={blockOptions} siteId={manager.siteId} siteName={manager.siteName} initialFilter={f} accounts={(accRes.data ?? []) as AccountOption[]} />
    </>
  );
}
