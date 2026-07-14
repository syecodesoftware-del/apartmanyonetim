import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { unitKey, type SnapUnit } from '@/lib/excel';

/** Diff/senkronizasyon için mevcut daire+sakin fotoğrafı (units + current_occupants).
 *  BulkImportWizard bununla "yeni / güncel / değişmeyen / dosyada yok" ayrımını yapar. */
export async function loadImportSnapshot(
  sb: SupabaseClient<Database>,
  siteId: string,
): Promise<SnapUnit[]> {
  const [{ data: units }, { data: occ }] = await Promise.all([
    sb.from('units').select('block, apartment_number, floor, arsa_payi, m2').eq('site_id', siteId),
    sb.from('current_occupants')
      .select('block, apartment_number, relationship, full_name, phone, tc_kimlik, language, notes, plates')
      .eq('site_id', siteId),
  ]);

  const snap = new Map<string, SnapUnit>();
  for (const u of units ?? []) {
    snap.set(unitKey(u.block ?? '', u.apartment_number), {
      block: u.block,
      apartment_number: u.apartment_number,
      floor: u.floor,
      arsa_payi: u.arsa_payi,
      m2: u.m2,
      language: null, notes: null, plates: null, malik: null, kiraci: null,
    });
  }
  for (const o of occ ?? []) {
    const s = snap.get(unitKey(o.block ?? '', o.apartment_number ?? ''));
    if (!s) continue;
    if (o.plates) s.plates = o.plates;
    const person = { full_name: o.full_name ?? '', phone: o.phone, tc_kimlik: o.tc_kimlik };
    if (o.relationship === 'kiraci') {
      s.kiraci = person;
      s.language = o.language; s.notes = o.notes; // sakin dili önceliklidir
    } else if (o.relationship === 'malik') {
      s.malik = person;
      if (s.language === null) { s.language = o.language; s.notes = o.notes; }
    }
  }
  return [...snap.values()];
}
