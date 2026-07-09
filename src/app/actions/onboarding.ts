'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/** Onboarding "Şimdilik atla": 30 gün boyunca 0-daire yönlendirmesi yapılmaz.
 *  Toplu aktarıma /units içindeki bölümden ve /excel sayfasından her zaman ulaşılabilir. */
export async function skipOnboarding() {
  (await cookies()).set('onboarding-skip', '1', { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax' });
  redirect('/');
}
