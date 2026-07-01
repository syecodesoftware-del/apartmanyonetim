import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from './env';
import type { Database } from './database.types';

/**
 * Sunucu tarafı Supabase istemcisi — anon anahtar + kullanıcının oturum çerezi.
 * Bütün sorgular RLS'e tabidir; yönetici yalnız kendi aktif sitesinin verisini görür.
 * (admin-panel'in service_role istemcisinin AKSİNE — burada RLS bypass YOKTUR.)
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookieOptions: { name: 'sb-manager-auth' },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component'ten çağrıldığında set edilemez; proxy oturumu tazeler.
        }
      },
    },
  });
}
