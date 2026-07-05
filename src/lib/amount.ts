/**
 * Para/tutar girişi ayrıştırma — TR (1.234,56) ve EN (1,234.56) biçimlerini güvenle çözer.
 * (K2/Y7 — FINANS-DENETIM-RAPORU-2026-07-02: virgülü silen eski sanitizer "12,5"i 125 yapıyordu.)
 *
 * Kurallar:
 *  - Hem ',' hem '.' varsa: SON görünen ayırıcı ondalıktır, diğeri binliktir.
 *  - Tek tür ayırıcı varsa: son grup 1-2 haneliyse ondalık; tüm gruplar 3 haneliyse binlik;
 *    aksi belirsizdir → NaN (belirsiz giriş asla sessizce yanlış sayıya dönmez).
 *  - manager-panel/src/lib/amount.ts ile birebir aynı tutulmalıdır.
 */
export function parseTrAmount(raw: string | null | undefined): number {
  let s = (raw ?? '').trim().replace(/\s/g, '');
  if (!s) return NaN;
  let sign = 1;
  if (s.startsWith('-')) { sign = -1; s = s.slice(1); }
  if (!/^[0-9.,]+$/.test(s) || !s) return NaN;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.';
    const other = dec === ',' ? '.' : ',';
    const cleaned = s.split(other).join('');
    const parts = cleaned.split(dec);
    if (parts.length !== 2 || parts[1].length < 1 || parts[1].length > 2 || !parts[0]) return NaN;
    normalized = parts[0] + '.' + parts[1];
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = s.split(sep);
    if (parts.some(p => p === '')) return NaN;
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = parts[0] + '.' + parts[1];         // ondalık: 12,5 · 12.50
    } else if (parts.slice(1).every(p => p.length === 3) && parts[0].length <= 3) {
      normalized = parts.join('');                    // binlik: 1.234 · 1,234,567
    } else {
      return NaN;                                     // belirsiz: 1,2345 vb.
    }
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? sign * n : NaN;
}

/**
 * Para OLMAYAN ondalık alanlar için (arsa payı, m², katsayı): tek ayırıcı DAİMA ondalıktır
 * ("0,0125" → 0.0125, "1.234" → 1.234 — binlik yorumu yapılmaz; bu alanlarda binlik gruplama beklenmez).
 * Para alanlarında parseTrAmount kullanın.
 */
export function parseTrDecimal(raw: string | null | undefined): number {
  let s = (raw ?? '').trim().replace(/\s/g, '');
  if (!s) return NaN;
  let sign = 1;
  if (s.startsWith('-')) { sign = -1; s = s.slice(1); }
  if (!/^[0-9.,]+$/.test(s) || !s) return NaN;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.';
    const other = dec === ',' ? '.' : ',';
    const parts = s.split(other).join('').split(dec);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return NaN;
    normalized = parts[0] + '.' + parts[1];
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = s.split(sep);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return NaN;
    normalized = parts[0] + '.' + parts[1];
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? sign * n : NaN;
}

/** Tutar alanı yazım filtresi: rakam + ',' + '.' (istenirse baştaki '-'). Anlamı submit'te parseTrAmount verir. */
export function sanitizeAmountInput(v: string, allowNegative = false): string {
  let s = (v ?? '').replace(allowNegative ? /[^0-9.,-]/g : /[^0-9.,]/g, '');
  if (allowNegative) s = s.replace(/(?!^)-/g, '');
  return s;
}
