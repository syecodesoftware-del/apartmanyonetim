/**
 * Ortam değişkenleri. Bu panelde YALNIZCA anon (publishable) anahtar vardır.
 * service_role anahtarı bilinçli olarak yoktur → siteler-arası veri sızma yüzeyi = 0.
 * NEXT_PUBLIC_* değerleri hem sunucu hem tarayıcıda okunur (anon anahtar public-safe).
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith('BURAYA_')) {
    throw new Error(
      `Eksik ortam değişkeni: ${name}. manager-panel/.env.local dosyasını .env.local.example'a göre doldurun.`,
    );
  }
  return v;
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
};
