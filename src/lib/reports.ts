/** Rapor tarih aralığı yardımcıları (server tarafı). */

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** searchParams'tan from/to alır; varsayılan: yılbaşı → bugün. */
export function parseRange(sp: { from?: string; to?: string }): { from: string; to: string } {
  const now = new Date();
  const defFrom = iso(new Date(now.getFullYear(), 0, 1));
  const defTo = iso(now);
  const re = /^\d{4}-\d{2}-\d{2}$/;
  return {
    from: sp.from && re.test(sp.from) ? sp.from : defFrom,
    to: sp.to && re.test(sp.to) ? sp.to : defTo,
  };
}

/** to gününün sonunu kapsayan üst sınır (timestamp kolonları için < toExclusive). */
export function toExclusive(to: string): string {
  const d = new Date(to + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return iso(d);
}

export const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function donemLabel(year: number, month: number): string {
  return `${AY_ADLARI[month - 1] ?? month} ${year}`;
}
