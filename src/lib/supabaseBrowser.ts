'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Tarayıcı tarafı Supabase istemcisi — anon anahtar + çerez tabanlı oturum.
 * İnteraktif Client Component'lerde (form/mutasyon) kullanılır. RLS yine devrededir.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function supabaseBrowser() {
  if (client) return client;
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { name: 'sb-manager-auth' } },
  );
  return client;
}
