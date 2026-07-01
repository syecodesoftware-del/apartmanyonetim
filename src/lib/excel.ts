import * as XLSX from 'xlsx';

/** Modül 4 — Excel ekosistemi ortak yardımcıları (manager-panel).
 *  Şablon başlıkları Türkçe; TC doğrulaması DB'deki is_valid_tc ile birebir. */

export const IMPORT_HEADERS = ['Blok', 'Daire No', 'Kat', 'Arsa Payı', 'Sakin Tipi', 'Ad Soyad', 'TC Kimlik', 'Telefon'] as const;

export type Resident = { relationship: 'malik' | 'kiraci'; full_name: string; tc_kimlik: string; phone: string | null };
export type ImportUnit = {
  block: string | null;
  apartment_number: string;
  floor: number | null;
  arsa_payi: number | null;
  residents: Resident[];
};

export type ParsedRow = {
  rowIndex: number; // Excel satır no (başlık hariç, 1'den)
  block: string | null;
  apartment_number: string;
  floor: number | null;
  arsa_payi: number | null;
  relationship: 'malik' | 'kiraci' | null;
  rawRelationship: string;
  full_name: string;
  tc_kimlik: string;
  phone: string | null;
  errors: string[];
};

export type ParseResult = {
  rows: ParsedRow[];
  units: ImportUnit[];
  errorCount: number;
};

/** Türk TC Kimlik No resmi algoritma doğrulaması (DB is_valid_tc birebir). */
export function isValidTc(tc: string): boolean {
  if (!/^[1-9][0-9]{10}$/.test(tc)) return false;
  const d = tc.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  if (d[9] !== (((odd * 7 - even) % 10) + 10) % 10) return false;
  const firstTen = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return d[10] === firstTen % 10;
}

function normRelationship(raw: string): 'malik' | 'kiraci' | null {
  const v = (raw ?? '').toString().trim().toLowerCase();
  if (['malik', 'owner', 'mülk sahibi', 'mulk sahibi', 'ev sahibi'].includes(v)) return 'malik';
  if (['kiraci', 'kiracı', 'tenant'].includes(v)) return 'kiraci';
  return null;
}

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const numOrNull = (v: unknown): number | null => {
  const t = s(v).replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN as unknown as number;
};

/** Yüklenen Excel'i satır satır parse + doğrula, sonra daire bazında grupla. */
export function parseImportWorkbook(data: ArrayBuffer): ParseResult {
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const rows: ParsedRow[] = json.map((r, i) => {
    const block = s(r['Blok']) || null;
    const apartment_number = s(r['Daire No']);
    const floorRaw = s(r['Kat']);
    const arsaRaw = s(r['Arsa Payı']);
    const rawRelationship = s(r['Sakin Tipi']);
    const relationship = normRelationship(rawRelationship);
    const full_name = s(r['Ad Soyad']);
    const tc_kimlik = s(r['TC Kimlik']);
    const phone = s(r['Telefon']) || null;

    const errors: string[] = [];
    if (!apartment_number) errors.push('Daire No boş');
    if (!rawRelationship) errors.push('Sakin Tipi boş');
    else if (!relationship) errors.push(`Geçersiz Sakin Tipi "${rawRelationship}" (malik/kiracı)`);
    if (!full_name) errors.push('Ad Soyad boş');
    if (!tc_kimlik) errors.push('TC Kimlik boş');
    else if (!isValidTc(tc_kimlik)) errors.push('TC Kimlik geçersiz');
    if (floorRaw && !Number.isFinite(Number(floorRaw))) errors.push('Kat sayısal değil');
    if (arsaRaw && !Number.isFinite(Number(arsaRaw.replace(',', '.')))) errors.push('Arsa Payı sayısal değil');

    return {
      rowIndex: i + 1,
      block,
      apartment_number,
      floor: floorRaw ? Number(floorRaw) : null,
      arsa_payi: arsaRaw ? Number(arsaRaw.replace(',', '.')) : null,
      relationship,
      rawRelationship,
      full_name,
      tc_kimlik,
      phone,
      errors,
    };
  });

  // Daire bazında grupla (Blok + Daire No anahtarı)
  const map = new Map<string, ImportUnit>();
  for (const r of rows) {
    if (!r.apartment_number) continue;
    const key = `${r.block ?? ''}|||${r.apartment_number}`;
    let u = map.get(key);
    if (!u) {
      u = { block: r.block, apartment_number: r.apartment_number, floor: r.floor, arsa_payi: r.arsa_payi, residents: [] };
      map.set(key, u);
    }
    if (r.relationship) {
      u.residents.push({ relationship: r.relationship, full_name: r.full_name, tc_kimlik: r.tc_kimlik, phone: r.phone });
    }
  }

  // Daire bazlı kural: her daire en az bir malik
  for (const u of map.values()) {
    const hasMalik = u.residents.some((x) => x.relationship === 'malik');
    if (!hasMalik) {
      for (const r of rows) {
        if ((r.block ?? '') === (u.block ?? '') && r.apartment_number === u.apartment_number) {
          r.errors.push('Bu dairede malik yok (her daire en az bir malik içermeli)');
        }
      }
    }
  }

  const errorCount = rows.reduce((a, r) => a + (r.errors.length > 0 ? 1 : 0), 0);
  return { rows, units: Array.from(map.values()), errorCount };
}

/** Boş şablon (.xlsx) — başlık satırı + 2 örnek satır, indirilir. */
export function buildTemplateBlob(): Blob {
  const rows = [
    { Blok: 'A', 'Daire No': '1', Kat: 2, 'Arsa Payı': 10, 'Sakin Tipi': 'malik', 'Ad Soyad': 'Örnek Malik', 'TC Kimlik': '10000000146', Telefon: '5551112233' },
    { Blok: 'A', 'Daire No': '1', Kat: 2, 'Arsa Payı': 10, 'Sakin Tipi': 'kiracı', 'Ad Soyad': 'Örnek Kiracı', 'TC Kimlik': '10000000146', Telefon: '5552223344' },
  ];
  const ws = XLSX.utils.json_to_sheet(rows, { header: IMPORT_HEADERS as unknown as string[] });
  ws['!cols'] = IMPORT_HEADERS.map(() => ({ wch: 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daire-Sakin');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Çok-sheet'li dışa aktarma; her tablo bir sheet. */
export function buildExportBlob(sheets: { name: string; rows: Record<string, unknown>[] }[]): Blob {
  const wb = XLSX.utils.book_new();
  for (const sh of sheets) {
    const ws = XLSX.utils.json_to_sheet(sh.rows.length ? sh.rows : [{ Bilgi: 'Kayıt yok' }]);
    // Excel sheet adı 31 karakter sınırı + geçersiz karakter temizliği
    const safe = sh.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(wb, ws, safe);
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
