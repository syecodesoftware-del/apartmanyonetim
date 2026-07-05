import 'server-only';

import { supabaseServer } from '@/lib/supabaseServer';

/**
 * O5 (KOD-DENETIM-RAPORU-2026-07-02): bellek-içi sayaç serverless'ta (Vercel) instance başına
 * sıfırlandığından etkisizdi. Sayaç artık DB'de (auth_rate_limits + check/clear RPC'leri).
 * RPC'ye ulaşılamazsa fail-open: giriş engellenmez (asıl koruma şifre doğrulamasıdır).
 */
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 5 * 60;

export async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const sb = await supabaseServer();
    const { data, error } = await sb.rpc('check_auth_rate_limit', {
      p_key: key, p_max: MAX_ATTEMPTS, p_window_seconds: WINDOW_SECONDS,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** Başarılı girişten SONRA çağrılır (o anda oturum var → authenticated; anon sayaç sıfırlayamaz). */
export async function clearRateLimit(key: string): Promise<void> {
  try {
    const sb = await supabaseServer();
    await sb.rpc('clear_auth_rate_limit', { p_key: key });
  } catch {
    // sayaç 1 gün içinde kendiliğinden temizlenir
  }
}
