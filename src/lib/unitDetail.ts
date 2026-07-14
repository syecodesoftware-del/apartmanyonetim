import { supabaseServer } from '@/lib/supabaseServer';

/** Daire detayının tüm verisi — tam sayfa (/units/[unitId]) ve popup (intercepted route) ortak kullanır. */
export async function getUnitDetailData(unitId: string) {
  const sb = await supabaseServer();

  const { data: unit } = await sb
    .from('units')
    .select('id, site_id, block, apartment_number, floor')
    .eq('id', unitId)
    .maybeSingle();
  if (!unit) return null;

  const [{ data: tenancies }, { data: balance }, { data: residents }, { data: ledger }, { data: accounts }, { data: vehicles }] = await Promise.all([
    sb
      .from('tenancies')
      .select('id, user_id, relationship, full_name, phone, tc_kimlik, language, notes, start_date, end_date')
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
    sb
      .from('cash_accounts')
      .select('id, ad, tur')
      .eq('site_id', unit.site_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    sb
      .from('unit_vehicles')
      .select('id, plate, label, active')
      .eq('unit_id', unitId)
      .eq('active', true)
      .order('created_at', { ascending: true }),
  ]);

  return {
    unit,
    unitLabel: [unit.block, unit.apartment_number].filter(Boolean).join(' / ') || 'Daire',
    tenancies: tenancies ?? [],
    totalDebt: Number(balance?.toplam_borc ?? 0),
    kalanAnapara: Number(balance?.kalan_anapara ?? 0),
    kalanGecikme: Number(balance?.kalan_gecikme ?? 0),
    residents: residents ?? [],
    ledger: ledger ?? [],
    accounts: accounts ?? [],
    vehicles: vehicles ?? [],
  };
}
