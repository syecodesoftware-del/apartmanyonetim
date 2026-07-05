/**
 * DB/RPC hata mesajından yalnız bilinen teknik önekleri ayıklar (SQLSTATE kalıbı: "P0001: mesaj").
 * Eski kalıp (ilk iki noktaya kadar her şeyi silen regex) mesajın içindeki ilk iki noktaya kadar
 * her şeyi yutuyordu ("Tutar geçersiz: 0'dan büyük olmalı" → "0'dan büyük olmalı").
 * mobile-app `src/utils/error.ts` ile birebir aynı tutulmalı.
 */
export function friendlyDbMessage(raw: string | null | undefined): string {
  const msg = (raw ?? '').trim();
  return msg.replace(/^[A-Z0-9]{5}:\s*/, '') || 'Beklenmeyen bir hata oluştu.';
}
