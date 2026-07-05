'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import { checkRateLimit, clearRateLimit } from '@/lib/rateLimit';

export type LoginState = { error?: string };

/** E-posta/şifre ile giriş; yalnız role manager/admin/auditor kullanıcılar kabul edilir (auditor salt-okunur — session.ts STAFF_ROLES ile uyumlu). */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'E-posta ve şifre gerekli.' };

  if (!(await checkRateLimit(`login:${email.toLowerCase()}`))) {
    return { error: 'Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.' };
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'E-posta veya şifre hatalı.' };

  // Rol doğrulaması — kullanıcının kendi profili (RLS ile okunur)
  const { data: profile } = await sb
    .from('users')
    .select('role, site_id')
    .eq('id', data.user.id)
    .single();

  if (!profile || !['manager', 'admin', 'auditor'].includes(profile.role ?? '')) {
    await sb.auth.signOut();
    return { error: 'Bu hesabın yönetici paneline erişim yetkisi yok.' };
  }
  if (!profile.site_id) {
    await sb.auth.signOut();
    return { error: 'Hesabınıza atanmış aktif bir site yok.' };
  }

  await clearRateLimit(`login:${email.toLowerCase()}`);
  redirect('/');
}

export async function logout() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect('/login');
}
