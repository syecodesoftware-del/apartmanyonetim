/**
 * O1 (KOD-DENETIM-RAPORU-2026-07-02): "bugün" her zaman Europe/Istanbul gününe sabitlenir.
 * Client'ta cihaz TR'deyse aynı sonucu verir; sunucuda (Vercel/UTC) gece 00:00-03:00 kaymasını önler.
 * 'en-CA' locale YYYY-MM-DD üretir.
 */
export function todayLocalISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** İstanbul gününe göre { year, month } — ay-granülerli raporlar (yaşlandırma) için. */
export function nowIstanbulYearMonth(): { year: number; month: number } {
  const [y, m] = todayLocalISO().split('-').map(Number);
  return { year: y, month: m };
}
