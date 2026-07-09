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
  rowIndex: number; // gerçek Excel satır no (1 = başlık; ilk veri satırı 2)
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
      rowIndex: i + 2,
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
    } else {
      // Aynı dairenin sonraki satırları: boş alan tamamlanır, dolu ve farklıysa hata (sessiz ilk-satır-kazanır yerine)
      if (u.floor === null && r.floor !== null) u.floor = r.floor;
      else if (r.floor !== null && u.floor !== null && r.floor !== u.floor) r.errors.push(`Kat çelişiyor (dairede ${u.floor}, bu satırda ${r.floor})`);
      if (u.arsa_payi === null && r.arsa_payi !== null) u.arsa_payi = r.arsa_payi;
      else if (r.arsa_payi !== null && u.arsa_payi !== null && r.arsa_payi !== u.arsa_payi) r.errors.push(`Arsa Payı çelişiyor (dairede ${u.arsa_payi}, bu satırda ${r.arsa_payi})`);
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

// ─────────────────────────────────────────────────────────────
// B3-3 Banka dosya içe aktarımı — genel CSV/Excel okuyucu + sütun eşleme
// ─────────────────────────────────────────────────────────────

export type SheetData = { headers: string[]; rows: string[][] };

/** İlk sayfayı başlık satırı + veri satırları olarak okur (CSV veya Excel). */
export function readSheetRows(data: ArrayBuffer): SheetData {
  const wb = XLSX.read(data, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (aoa.length === 0) return { headers: [], rows: [] };
  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? '').trim());
  const rows = aoa.slice(1).map((r) => headers.map((_, i) => String((r as unknown[])[i] ?? '').trim()));
  return { headers, rows };
}

export type BankColMap = {
  date: number;
  amount: number;
  /** Ayrı yön sütunu indeksi; signMode=true ise yok sayılır. */
  direction: number | null;
  description: number | null;
  counterparty: number | null;
  ref: number | null;
  /** true: tutarın işareti yönü belirler (negatif=çıkış). false: ayrı yön sütunu. */
  signMode: boolean;
};

export type BankTxnDraft = {
  txn_date: string;
  direction: 'giris' | 'cikis';
  amount: number;
  description: string | null;
  counterparty: string | null;
  bank_ref: string | null;
};

export type BankParseResult = { txns: BankTxnDraft[]; errors: { row: number; msg: string }[] };

/** "1.234,50" / "-300,50" / "(300,50)" / "1234.50" → işaretli sayı. */
export function parseSignedAmount(raw: string): number | null {
  let s = (raw ?? '').trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  if (s.startsWith('+')) s = s.slice(1);
  s = s.replace(/[₺\s]/g, '');
  // binlik/ondalık: son ayraç ondalıktır
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/** Yaygın TR tarih formatlarını ISO'ya (yyyy-mm-dd) çevirir. */
export function parseBankDate(raw: string): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); // yyyy-mm-dd
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/); // dd.mm.yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/); // dd.mm.yy
  if (m) return `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function normDirectionCell(raw: string): 'giris' | 'cikis' | null {
  const s = (raw ?? '').trim().toLocaleLowerCase('tr-TR');
  if (!s) return null;
  if (/^(g|giriş|giris|alacak|\+|credit|c)/.test(s) && !/çık|cik/.test(s)) return 'giris';
  if (/^(ç|c|çıkış|cikis|çikis|borç|borc|-|debit|d)/.test(s)) return 'cikis';
  return null;
}

/** Eşlenen sütunlarla satırları bank_transactions taslaklarına çevirir + hataları toplar. */
export function mapBankRows(headers: string[], rows: string[][], map: BankColMap): BankParseResult {
  const txns: BankTxnDraft[] = [];
  const errors: { row: number; msg: string }[] = [];

  rows.forEach((r, i) => {
    const rowNo = i + 2; // başlık = 1
    const dateISO = parseBankDate(r[map.date] ?? '');
    const amtRaw = parseSignedAmount(r[map.amount] ?? '');
    if (!dateISO) { errors.push({ row: rowNo, msg: `Tarih okunamadı: "${r[map.date] ?? ''}"` }); return; }
    if (amtRaw === null) { errors.push({ row: rowNo, msg: `Tutar okunamadı: "${r[map.amount] ?? ''}"` }); return; }

    let direction: 'giris' | 'cikis' | null;
    if (map.signMode) {
      direction = amtRaw < 0 ? 'cikis' : 'giris';
    } else if (map.direction !== null) {
      direction = normDirectionCell(r[map.direction] ?? '');
      if (!direction) { errors.push({ row: rowNo, msg: `Yön okunamadı: "${r[map.direction] ?? ''}"` }); return; }
    } else {
      direction = amtRaw < 0 ? 'cikis' : 'giris';
    }

    const amount = Math.abs(amtRaw);
    if (amount === 0) { errors.push({ row: rowNo, msg: 'Tutar 0' }); return; }

    txns.push({
      txn_date: dateISO,
      direction,
      amount: Math.round(amount * 100) / 100,
      description: map.description !== null ? (r[map.description] || null) : null,
      counterparty: map.counterparty !== null ? (r[map.counterparty] || null) : null,
      bank_ref: map.ref !== null ? (r[map.ref] || null) : null,
    });
  });

  return { txns, errors };
}

/** Başlık adından sütun tahmini (otomatik eşleme için). */
export function guessBankColumns(headers: string[]): Partial<BankColMap> {
  const find = (...keys: string[]) => {
    const idx = headers.findIndex((h) => {
      const l = h.toLocaleLowerCase('tr-TR');
      return keys.some((k) => l.includes(k));
    });
    return idx >= 0 ? idx : null;
  };
  return {
    date: find('tarih', 'date') ?? 0,
    amount: find('tutar', 'tutarı', 'amount', 'işlem tutar') ?? 1,
    direction: find('yön', 'yon', 'borç/alacak', 'b/a', 'tür', 'tip'),
    description: find('açıklama', 'aciklama', 'description', 'detay'),
    counterparty: find('karşı', 'karsi', 'gönderen', 'unvan', 'ad soyad', 'isim'),
    ref: find('referans', 'ref', 'dekont', 'fiş', 'işlem no', 'sıra'),
  };
}
