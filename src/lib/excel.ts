import * as XLSX from 'xlsx';

/** Excel ekosistemi ortak yardımcıları (manager-panel).
 *  Onboarding toplu daire aktarımı: geniş format — 1 satır = 1 daire (malik + kiracı aynı satırda).
 *  TC opsiyonel (doluysa checksum); telefon TR normalizasyonu; doğrulama editörde canlı yeniden koşar. */

export const IMPORT_HEADERS = [
  'Blok', 'Daire No', 'Kat', 'Arsa Payı', 'm²',
  'Mülk Sahibi Ad Soyad', 'Malik TC', 'Malik Telefon',
  'Kiracı Ad Soyad', 'Kiracı TC', 'Kiracı Telefon',
  'Plaka', 'İletişim Dili', 'Açıklama',
] as const;

/** Editörde tutulan ham satır — tüm alanlar string, dönüşüm gönderimde yapılır. */
export type ImportRow = {
  key: number; // React satır kimliği (Excel satır no değil; editörde ekleme/silme olur)
  block: string;
  apartment_number: string;
  floor: string;
  arsa_payi: string;
  m2: string;
  malik_name: string;
  malik_tc: string;
  malik_phone: string;
  kiraci_name: string;
  kiraci_tc: string;
  kiraci_phone: string;
  plate: string;
  language: string;
  notes: string;
};

export type ImportField = Exclude<keyof ImportRow, 'key'>;

export type ValidatedRow = ImportRow & {
  errors: string[];
  errorFields: ImportField[];
  /** Eksik ama zorunlu olmayan alanlar — bloklamaz, sarı uyarı gösterilir (Rapor Madde 7). */
  warnings: string[];
  warnFields: ImportField[];
  /** Aynı Blok+Daire No sitede zaten kayıtlı → içe aktarmada atlanır (hata değil). */
  exists: boolean;
};

/** Desteklenen iletişim dilleri (tenancies.language check ile birebir). */
export const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Deutsch' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

/** Serbest yazılmış dil hücresini ('Türkçe', 'english', 'ar', 'العربية'…) koda çevirir; tanınmazsa null. */
export function normalizeLanguage(raw: string): LangCode | null {
  const s = (raw ?? '').trim().toLocaleLowerCase('tr-TR');
  if (!s) return null;
  if (/^(tr|tur|türk|turk)/.test(s) || s.includes('türkçe') || s.includes('turkce')) return 'tr';
  if (/^(en|ing)/.test(s) || s.includes('english') || s.includes('ingiliz')) return 'en';
  if (/^ar/.test(s) || s.includes('arap') || s.includes('عرب')) return 'ar';
  if (/^ru/.test(s) || s.includes('rus') || s.includes('русск')) return 'ru';
  if (/^(de|al)/.test(s) || s.includes('deutsch') || s.includes('alman') || s.includes('german')) return 'de';
  return null;
}

/** Plaka normalizasyonu: boşluksuz, büyük harf. Boşsa null. */
export function normalizePlate(raw: string): string | null {
  const s = (raw ?? '').replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
  return s || null;
}

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

/** TR cep telefonu → "5xxxxxxxxx" (10 hane). Kabul: 05xx…, +90 5xx…, 90 5xx…, 5xx…. Geçersizse null. */
export function normalizePhoneTR(raw: string): string | null {
  let d = (raw ?? '').replace(/\D/g, '');
  if (d.startsWith('0090')) d = d.slice(4);
  if (d.length === 12 && d.startsWith('90')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.length === 10 && d.startsWith('5') ? d : null;
}

/** Blok+Daire No eşleşme anahtarı — hem dosya-içi tekrar hem DB "zaten var" kontrolü bununla yapılır. */
export const unitKey = (block: string, apt: string) =>
  `${(block ?? '').trim().toLocaleLowerCase('tr-TR')}|||${(apt ?? '').trim().toLocaleLowerCase('tr-TR')}`;

export const emptyImportRow = (key: number): ImportRow => ({
  key, block: '', apartment_number: '', floor: '', arsa_payi: '', m2: '',
  malik_name: '', malik_tc: '', malik_phone: '', kiraci_name: '', kiraci_tc: '', kiraci_phone: '',
  plate: '', language: '', notes: '',
});

const numOk = (v: string) => Number.isFinite(Number(v.replace(',', '.')));

/** Tüm satırları doğrular; editörde her değişiklikte yeniden koşar (dosya-içi tekrar dahil).
 *  Hatalar (kırmızı) içe aktarımı bloklar; uyarılar (sarı) bloklamaz — eksik opsiyonel alanlar. */
export function validateRows(rows: ImportRow[], existingKeys: Set<string>): ValidatedRow[] {
  const seen = new Map<string, number>(); // unitKey -> ilk görüldüğü satır index'i
  return rows.map((r, i) => {
    const errors: string[] = [];
    const errorFields: ImportField[] = [];
    const err = (f: ImportField, m: string) => { errors.push(m); errorFields.push(f); };
    const warnings: string[] = [];
    const warnFields: ImportField[] = [];
    const warn = (f: ImportField, m: string) => { warnings.push(m); warnFields.push(f); };

    const apt = r.apartment_number.trim();
    if (!apt) err('apartment_number', 'Daire No boş');
    if (!r.malik_name.trim()) err('malik_name', 'Mülk Sahibi boş (her dairede malik zorunlu)');

    if (r.malik_tc.trim() && !isValidTc(r.malik_tc.trim())) err('malik_tc', 'Malik TC geçersiz');
    if (r.kiraci_tc.trim() && !isValidTc(r.kiraci_tc.trim())) err('kiraci_tc', 'Kiracı TC geçersiz');
    if (r.malik_phone.trim() && !normalizePhoneTR(r.malik_phone)) err('malik_phone', 'Malik telefon geçersiz (5xx ile 10 hane)');
    if (r.kiraci_phone.trim() && !normalizePhoneTR(r.kiraci_phone)) err('kiraci_phone', 'Kiracı telefon geçersiz (5xx ile 10 hane)');

    if (!r.kiraci_name.trim() && (r.kiraci_tc.trim() || r.kiraci_phone.trim())) {
      err('kiraci_name', 'Kiracı Ad Soyad boş (TC/telefon girilmiş)');
    }

    if (r.floor.trim() && !Number.isInteger(Number(r.floor.trim()))) err('floor', 'Kat tam sayı olmalı');
    if (r.arsa_payi.trim() && !numOk(r.arsa_payi.trim())) err('arsa_payi', 'Arsa Payı sayısal değil');
    if (r.m2.trim() && !numOk(r.m2.trim())) err('m2', 'm² sayısal değil');

    // ── Uyarılar (bloklamaz): eksik iletişim bilgisi + tanınmayan dil ──
    if (r.malik_name.trim()) {
      if (!r.malik_tc.trim()) warn('malik_tc', 'Malik TC eksik');
      if (!r.malik_phone.trim()) warn('malik_phone', 'Malik telefon eksik');
    }
    if (r.kiraci_name.trim()) {
      if (!r.kiraci_tc.trim()) warn('kiraci_tc', 'Kiracı TC eksik');
      if (!r.kiraci_phone.trim()) warn('kiraci_phone', 'Kiracı telefon eksik');
    }
    if (r.language.trim() && !normalizeLanguage(r.language)) warn('language', 'Dil tanınmadı — Türkçe varsayılacak');

    let exists = false;
    if (apt) {
      const key = unitKey(r.block, apt);
      const first = seen.get(key);
      if (first !== undefined) err('apartment_number', `Aynı daire dosyada tekrar ediyor (${first + 1}. satırla aynı)`);
      else seen.set(key, i);
      exists = existingKeys.has(key);
    }

    return { ...r, errors, errorFields, warnings, warnFields, exists };
  });
}

// Başlık eşleme: normalize edilmiş başlık → alan (şablon + yaygın eşanlamlılar)
const HEADER_ALIASES: Record<string, ImportField> = {
  'blok': 'block', 'blokadi': 'block', 'ada': 'block', 'bina': 'block',
  'daireno': 'apartment_number', 'daire': 'apartment_number', 'kapino': 'apartment_number',
  'bagimsizbolum': 'apartment_number', 'bagimsizbolumno': 'apartment_number', 'no': 'apartment_number',
  'kat': 'floor',
  'arsapayi': 'arsa_payi',
  'm2': 'm2', 'metrekare': 'm2', 'brutm2': 'm2',
  'mulksahibiadsoyad': 'malik_name', 'mulksahibi': 'malik_name', 'malikadsoyad': 'malik_name', 'malik': 'malik_name', 'evsahibi': 'malik_name',
  'maliktc': 'malik_tc', 'mulksahibitc': 'malik_tc', 'maliktckimlik': 'malik_tc',
  'maliktelefon': 'malik_phone', 'mulksahibitelefon': 'malik_phone', 'maliktel': 'malik_phone',
  'kiraciadsoyad': 'kiraci_name', 'kiraci': 'kiraci_name',
  'kiracitc': 'kiraci_tc', 'kiracitckimlik': 'kiraci_tc',
  'kiracitelefon': 'kiraci_phone', 'kiracitel': 'kiraci_phone',
  'plaka': 'plate', 'plakano': 'plate', 'aracplaka': 'plate', 'aracplakasi': 'plate', 'plate': 'plate',
  'iletisimdili': 'language', 'dil': 'language', 'tercihdil': 'language', 'tercihedilendil': 'language', 'language': 'language',
  'aciklama': 'notes', 'not': 'notes', 'notlar': 'notes', 'aciklamalar': 'notes', 'notes': 'notes',
};

const normHeader = (h: string) =>
  h.toLocaleLowerCase('tr-TR')
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİi]/g, 'i')
    .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .replace(/[²]/g, '2')
    .replace(/[^a-z0-9]/g, '');

/** Algılanan sütun eşlemesi — sütun eşleştirme şeffaflığı (extra madde). */
export type ImportParseMeta = {
  rows: ImportRow[];
  /** Tanınan başlıklar: hangi Excel başlığı → hangi alan. */
  mapping: { field: ImportField; header: string }[];
  /** Hiçbir alana eşlenemeyen başlıklar (dolu olanlar). */
  unmatched: string[];
};

const FIELD_LABEL: Record<ImportField, string> = {
  block: 'Blok', apartment_number: 'Daire No', floor: 'Kat', arsa_payi: 'Arsa Payı', m2: 'm²',
  malik_name: 'Mülk Sahibi', malik_tc: 'Malik TC', malik_phone: 'Malik Telefon',
  kiraci_name: 'Kiracı', kiraci_tc: 'Kiracı TC', kiraci_phone: 'Kiracı Telefon',
  plate: 'Plaka', language: 'İletişim Dili', notes: 'Açıklama',
};
export const importFieldLabel = (f: ImportField) => FIELD_LABEL[f];

/** Yüklenen Excel'in ilk sayfasını editör satırları + algılanan sütun eşlemesine çevirir. */
export function parseImportWorkbookWithMeta(data: ArrayBuffer): ImportParseMeta {
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Dosyada okunacak sayfa yok');
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (aoa.length < 2) throw new Error('Dosyada başlık satırından başka veri yok');

  const col: Partial<Record<ImportField, number>> = {};
  const mapping: { field: ImportField; header: string }[] = [];
  const unmatched: string[] = [];
  (aoa[0] as unknown[]).forEach((h, i) => {
    const header = String(h ?? '').trim();
    if (!header) return;
    const f = HEADER_ALIASES[normHeader(header)];
    if (f && col[f] === undefined) { col[f] = i; mapping.push({ field: f, header }); }
    else if (!f) unmatched.push(header);
  });
  if (col.apartment_number === undefined) {
    throw new Error('"Daire No" sütunu bulunamadı. Lütfen örnek şablondaki başlıkları kullanın.');
  }

  const get = (r: unknown[], f: ImportField) => (col[f] === undefined ? '' : String(r[col[f]!] ?? '').trim());

  const rows = aoa.slice(1)
    .map((r, i): ImportRow => ({
      key: i + 1,
      block: get(r, 'block'),
      apartment_number: get(r, 'apartment_number'),
      floor: get(r, 'floor'),
      arsa_payi: get(r, 'arsa_payi'),
      m2: get(r, 'm2'),
      malik_name: get(r, 'malik_name'),
      malik_tc: get(r, 'malik_tc'),
      malik_phone: get(r, 'malik_phone'),
      kiraci_name: get(r, 'kiraci_name'),
      kiraci_tc: get(r, 'kiraci_tc'),
      kiraci_phone: get(r, 'kiraci_phone'),
      plate: get(r, 'plate'),
      language: get(r, 'language'),
      notes: get(r, 'notes'),
    }))
    .filter((r) => r.block || r.apartment_number || r.malik_name || r.kiraci_name || r.malik_tc || r.kiraci_tc);

  return { rows, mapping, unmatched };
}

/** Geriye dönük: yalnız satırları döndürür. */
export function parseImportWorkbook(data: ArrayBuffer): ImportRow[] {
  return parseImportWorkbookWithMeta(data).rows;
}

/** RPC'ye giden daire satırı (bulk_import_units_residents v2 sözleşmesi). */
export type RpcUnitRow = {
  block: string | null;
  apartment_number: string;
  floor: number | null;
  arsa_payi: number | null;
  m2: number | null;
  malik: { full_name: string; tc_kimlik: string | null; phone: string | null };
  kiraci: { full_name: string; tc_kimlik: string | null; phone: string | null } | null;
  plate: string | null;
  language: LangCode | null;
  notes: string | null;
};

/** Hangi satırlar içe aktarılacak? Hatasız + (yeni VEYA güncelleme modunda mevcut). */
export function isImportable(r: ValidatedRow, updateExisting: boolean): boolean {
  return r.errors.length === 0 && (!r.exists || updateExisting);
}

/** Hatası olmayan, uygulanacak satırları RPC yüküne çevirir.
 *  updateExisting=false → mevcut daireler atlanır; true → hepsi gönderilir (RPC güncelleme yapar). */
export function toRpcRows(rows: ValidatedRow[], updateExisting = false): RpcUnitRow[] {
  return rows
    .filter((r) => isImportable(r, updateExisting))
    .map((r) => ({
      block: r.block.trim() || null,
      apartment_number: r.apartment_number.trim(),
      floor: r.floor.trim() ? Number(r.floor.trim()) : null,
      arsa_payi: r.arsa_payi.trim() ? Number(r.arsa_payi.trim().replace(',', '.')) : null,
      m2: r.m2.trim() ? Number(r.m2.trim().replace(',', '.')) : null,
      malik: {
        full_name: r.malik_name.trim(),
        tc_kimlik: r.malik_tc.trim() || null,
        phone: normalizePhoneTR(r.malik_phone),
      },
      kiraci: r.kiraci_name.trim()
        ? {
            full_name: r.kiraci_name.trim(),
            tc_kimlik: r.kiraci_tc.trim() || null,
            phone: normalizePhoneTR(r.kiraci_phone),
          }
        : null,
      plate: normalizePlate(r.plate),
      language: normalizeLanguage(r.language),
      notes: r.notes.trim() || null,
    }));
}

/* ── Diff / senkronizasyon (Rapor Madde 1) ─────────────────────────────────
 *  Yeni Excel ile sistemdeki mevcut veri karşılaştırılır; her satır sınıflandırılır.
 *  KARAR: "dosyada yok" yalnız gösterilir — hiçbir kayıt SİLİNMEZ. */

export type PersonSnap = { full_name: string; phone: string | null; tc_kimlik: string | null };
export type SnapUnit = {
  block: string | null;
  apartment_number: string;
  floor: number | null;
  arsa_payi: number | null;
  m2: number | null;
  language: string | null;
  notes: string | null;
  plates: string | null; // virgülle ayrılmış aktif plakalar
  malik: PersonSnap | null;
  kiraci: PersonSnap | null;
};
/** unitKey → mevcut daire durumu. Sayfa `units` + `current_occupants`'tan kurar. */
export type CurrentSnapshot = Map<string, SnapUnit>;

export type RowClass = 'yeni' | 'guncel' | 'degismeyen' | 'dosyada_yok';

export type ClassifiedRow = ValidatedRow & { cls: RowClass; changes: string[] };

/** Sistemde olup dosyada olmayan daire (yalnız bilgi — silinmez). */
export type MissingUnit = { block: string | null; apartment_number: string; label: string; occupants: string };

const normName = (s: string) => (s ?? '').trim().toLocaleLowerCase('tr-TR');

/** Doğrulanmış satırları mevcut duruma göre sınıflandırır + dosyada olmayan daireleri bulur. */
export function classifyRows(
  rows: ValidatedRow[],
  snap: CurrentSnapshot,
): { rows: ClassifiedRow[]; missing: MissingUnit[] } {
  const fileKeys = new Set<string>();

  const classified = rows.map((r): ClassifiedRow => {
    const apt = r.apartment_number.trim();
    const key = apt ? unitKey(r.block, apt) : '';
    if (key) fileKeys.add(key);

    const cur = key ? snap.get(key) : undefined;
    if (!cur) return { ...r, cls: 'yeni', changes: [] };

    const changes: string[] = [];
    // Daire metası — RPC yalnız BOŞ alanı doldurur
    if (r.floor.trim() && cur.floor === null) changes.push('Kat eklenecek');
    if (r.arsa_payi.trim() && cur.arsa_payi === null) changes.push('Arsa payı eklenecek');
    if (r.m2.trim() && cur.m2 === null) changes.push('m² eklenecek');

    // Malik — RPC ismi değiştirmez, yalnız boş tel/TC tamamlar
    const mPhone = normalizePhoneTR(r.malik_phone);
    if (cur.malik) {
      if (mPhone && !cur.malik.phone) changes.push('Malik telefonu tamamlanacak');
      if (r.malik_tc.trim() && !cur.malik.tc_kimlik) changes.push('Malik TC tamamlanacak');
    } else if (r.malik_name.trim()) {
      changes.push('Malik eklenecek');
    }

    // Kiracı — isim aynıysa tamamla; farklıysa devir; yoksa ekle
    if (r.kiraci_name.trim()) {
      const kPhone = normalizePhoneTR(r.kiraci_phone);
      if (!cur.kiraci) {
        changes.push('Kiracı eklenecek');
      } else if (normName(cur.kiraci.full_name) === normName(r.kiraci_name)) {
        if (kPhone && !cur.kiraci.phone) changes.push('Kiracı telefonu tamamlanacak');
        if (r.kiraci_tc.trim() && !cur.kiraci.tc_kimlik) changes.push('Kiracı TC tamamlanacak');
      } else {
        changes.push('Kiracı değişiyor (devir)');
      }
    }

    // Dil / açıklama — Excel doluysa ve farklıysa
    const lang = normalizeLanguage(r.language);
    if (lang && lang !== (cur.language ?? 'tr')) changes.push('İletişim dili güncellenecek');
    if (r.notes.trim() && r.notes.trim() !== (cur.notes ?? '')) changes.push('Açıklama güncellenecek');

    // Plaka — Excel doluysa ve mevcut aktif plakalarda yoksa
    const plate = normalizePlate(r.plate);
    if (plate) {
      const have = (cur.plates ?? '').split(',').map((p) => normalizePlate(p) ?? '').filter(Boolean);
      if (!have.includes(plate)) changes.push('Plaka eklenecek');
    }

    return { ...r, cls: changes.length ? 'guncel' : 'degismeyen', changes };
  });

  const missing: MissingUnit[] = [];
  for (const [key, u] of snap) {
    if (fileKeys.has(key)) continue;
    const occ = [u.malik?.full_name, u.kiraci?.full_name].filter(Boolean).join(', ');
    missing.push({
      block: u.block,
      apartment_number: u.apartment_number,
      label: [u.block, u.apartment_number].filter(Boolean).join(' '),
      occupants: occ,
    });
  }
  missing.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
  return { rows: classified, missing };
}

/** Hatalı satırları "Hata Nedeni" sütunlu bir Excel'e döker (indirilebilir hata raporu). */
export function buildErrorReportBlob(rows: ValidatedRow[]): Blob {
  const bad = rows.filter((r) => r.errors.length > 0);
  const out = bad.map((r) => ({
    Blok: r.block,
    'Daire No': r.apartment_number,
    'Mülk Sahibi': r.malik_name,
    'Malik TC': r.malik_tc,
    'Malik Telefon': r.malik_phone,
    'Kiracı': r.kiraci_name,
    'Kiracı TC': r.kiraci_tc,
    'Kiracı Telefon': r.kiraci_phone,
    Plaka: r.plate,
    'İletişim Dili': r.language,
    'Açıklama': r.notes,
    'Hata Nedeni': r.errors.join(' • '),
  }));
  return buildExportBlob([{ name: 'Hatalı Satırlar', rows: out }]);
}

/** Şablon (.xlsx): "Daireler" sayfası (başlık + 3 örnek satır) + "Nasıl Doldurulur" açıklama sayfası. */
export function buildTemplateBlob(): Blob {
  const wb = XLSX.utils.book_new();

  const dataRows = [
    [...IMPORT_HEADERS],
    ['A', '1', '1', '10', '120', 'Ali Yılmaz', '10000000146', '5551112233', 'Ayşe Demir', '', '5552223344', '34 ABC 123', 'Türkçe', 'Aidatı banka ile ödüyor'],
    ['A', '2', '1', '10', '120', 'Mehmet Kaya', '', '5553334455', '', '', '', '', 'Türkçe', ''],
    ['B', '1', '2', '12', '145', 'Fatma Çelik', '', '', 'Can Aydın', '', '5554445566', '', 'English', 'Sadece WhatsApp kullanıyor'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(dataRows);
  ws['!cols'] = IMPORT_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 4) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Daireler');

  const help = [
    ['NASIL DOLDURULUR?'],
    [''],
    ['Her satır BİR dairedir. Mülk sahibi ve (varsa) kiracı aynı satıra yazılır.'],
    [''],
    ['Sütun', 'Zorunlu mu?', 'Açıklama'],
    ['Blok', 'Hayır', 'Blok/bina adı (A, B, C blok…). Tek bloklu apartmanda boş bırakın. Yeni blok adları otomatik oluşturulur.'],
    ['Daire No', 'EVET', 'Dairenin kapı numarası. Aynı blokta iki kez yazılamaz.'],
    ['Kat', 'Hayır', 'Tam sayı (zemin için 0, bodrum için -1 yazılabilir).'],
    ['Arsa Payı', 'Hayır', 'Sayı (virgüllü olabilir). Arsa paylı aidat dağıtımında kullanılır.'],
    ['m²', 'Hayır', 'Dairenin metrekaresi (sayı).'],
    ['Mülk Sahibi Ad Soyad', 'EVET', 'Her dairenin bir mülk sahibi olmalıdır.'],
    ['Malik TC', 'Hayır', 'Doldurursanız geçerli bir TC Kimlik No olmalıdır (11 hane).'],
    ['Malik Telefon', 'Hayır', '5xx xxx xx xx biçiminde cep telefonu. 0 veya +90 ile de yazabilirsiniz.'],
    ['Kiracı Ad Soyad', 'Hayır', 'Dairede kiracı oturuyorsa yazın; malik oturuyorsa boş bırakın.'],
    ['Kiracı TC', 'Hayır', 'Doldurursanız geçerli olmalıdır.'],
    ['Kiracı Telefon', 'Hayır', 'Kiracının cep telefonu.'],
    ['Plaka', 'Hayır', 'Dairenin aracı varsa plakası (34 ABC 123). Bariyer/otopark modülü bunu kullanır.'],
    ['İletişim Dili', 'Hayır', 'Sakinin tercih ettiği dil: Türkçe, English, العربية, Русский veya Deutsch. SMS/e-posta/bildirim bu dilde gönderilir. Boşsa Türkçe.'],
    ['Açıklama', 'Hayır', 'Serbest not (örn. "Yaşlı", "Sadece WhatsApp", "Yurt dışında"). İleride bu alana göre filtreleyebilirsiniz.'],
    [''],
    ['Yükledikten sonra tüm satırları ekranda görecek, düzeltme/ekleme/silme yapabileceksiniz.'],
    ['Hiçbir kayıt siz "İçe Aktar" butonuna basmadan oluşturulmaz.'],
  ];
  const wsHelp = XLSX.utils.aoa_to_sheet(help);
  wsHelp['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Nasıl Doldurulur');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ── Toplu davet (Başvuru & Davetler → Toplu Davet) ─────────────────────── */

export const INVITE_HEADERS = ['Ad Soyad', 'TC Kimlik', 'Blok', 'Daire No', 'Telefon', 'E-posta'] as const;

export type InviteRow = {
  key: number;
  full_name: string;
  tc_kimlik: string;
  block: string;
  apartment_number: string;
  phone: string;
  email: string;
};

const INVITE_ALIASES: Record<string, Exclude<keyof InviteRow, 'key'>> = {
  'adsoyad': 'full_name', 'isim': 'full_name', 'ad': 'full_name', 'adisoyadi': 'full_name',
  'tckimlik': 'tc_kimlik', 'tc': 'tc_kimlik', 'tckimlikno': 'tc_kimlik', 'tcno': 'tc_kimlik', 'kimlikno': 'tc_kimlik',
  'blok': 'block', 'blokadi': 'block', 'bina': 'block',
  'daireno': 'apartment_number', 'daire': 'apartment_number', 'kapino': 'apartment_number', 'no': 'apartment_number',
  'telefon': 'phone', 'gsm': 'phone', 'cep': 'phone', 'ceptelefonu': 'phone', 'tel': 'phone',
  'eposta': 'email', 'email': 'email', 'mail': 'email',
};

/** Davet listesinin ilk sayfasını satırlara çevirir (doğrulama modalda yapılır). */
export function parseInviteWorkbook(data: ArrayBuffer): InviteRow[] {
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Dosyada okunacak sayfa yok');
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (aoa.length < 2) throw new Error('Dosyada başlık satırından başka veri yok');

  const col: Partial<Record<Exclude<keyof InviteRow, 'key'>, number>> = {};
  (aoa[0] as unknown[]).forEach((h, i) => {
    const f = INVITE_ALIASES[normHeader(String(h ?? ''))];
    if (f && col[f] === undefined) col[f] = i;
  });
  if (col.full_name === undefined) {
    throw new Error('"Ad Soyad" sütunu bulunamadı. Lütfen örnek şablondaki başlıkları kullanın.');
  }

  const get = (r: unknown[], f: Exclude<keyof InviteRow, 'key'>) =>
    (col[f] === undefined ? '' : String(r[col[f]!] ?? '').trim());

  return aoa.slice(1)
    .map((r, i): InviteRow => ({
      key: i + 1,
      full_name: get(r, 'full_name'),
      tc_kimlik: get(r, 'tc_kimlik'),
      block: get(r, 'block'),
      apartment_number: get(r, 'apartment_number'),
      phone: get(r, 'phone'),
      email: get(r, 'email'),
    }))
    .filter((r) => r.full_name || r.tc_kimlik || r.apartment_number);
}

/** Davet şablonu (.xlsx): "Davetler" sayfası + kısa açıklama sayfası. */
export function buildInviteTemplateBlob(): Blob {
  const wb = XLSX.utils.book_new();

  const dataRows = [
    [...INVITE_HEADERS],
    ['Ali Yılmaz', '10000000146', 'A', '1', '5551112233', 'ali@example.com'],
    ['Ayşe Demir', '', 'A', '2', '05552223344', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(dataRows);
  ws['!cols'] = INVITE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 6) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Davetler');

  const help = [
    ['NASIL DOLDURULUR?'],
    [''],
    ['Her satır davet edilecek BİR kişidir. Tüm davetler "Sakin" rolüyle oluşturulur.'],
    [''],
    ['Sütun', 'Zorunlu mu?', 'Açıklama'],
    ['Ad Soyad', 'EVET', 'Davet edilecek kişinin adı soyadı.'],
    ['TC Kimlik', 'Hayır', 'Doldurursanız geçerli olmalıdır; kişi kayıt olurken TC ile otomatik eşleşir. Boşsa kişi davet kodunu girmelidir.'],
    ['Blok', 'Hayır', 'Tek bloklu apartmanda boş bırakın.'],
    ['Daire No', 'EVET', 'Kişinin oturduğu/sahibi olduğu daire.'],
    ['Telefon', 'Hayır', '5xx xxx xx xx biçiminde. 0 veya +90 ile de yazabilirsiniz.'],
    ['E-posta', 'Hayır', 'Varsa e-posta adresi.'],
    [''],
    ['Yükledikten sonra listeyi ekranda görecek, kimlerin davet edileceğini seçeceksiniz.'],
    ['Hiçbir davet siz onaylamadan oluşturulmaz.'],
  ];
  const wsHelp = XLSX.utils.aoa_to_sheet(help);
  wsHelp['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Nasıl Doldurulur');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Banka ekstresi vb. serbest tablolar için: ilk sayfayı ham hücre ızgarası olarak okur.
 *  Tarih hücreleri yyyy-mm-dd olarak biçimlenir; boş satırlar atılır. */
export function parseGenericWorkbook(data: ArrayBuffer): string[][] {
  const wb = XLSX.read(data, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' });
  return rows
    .map((r) => (r as unknown[]).map((c) => String(c ?? '').trim()))
    .filter((r) => r.some((c) => c !== ''));
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
