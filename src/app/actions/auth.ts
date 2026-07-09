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
    .select('role, site_id, approval_status')
    .eq('id', data.user.id)
    .single();

  const isStaff = ['manager', 'admin', 'auditor'].includes(profile?.role ?? '');
  const isResident = profile?.role === 'resident';
  if (!profile || (!isStaff && !isResident)) {
    await sb.auth.signOut();
    return { error: 'Bu hesabın panele erişim yetkisi yok.' };
  }
  if (!profile.site_id) {
    await sb.auth.signOut();
    return { error: 'Hesabınıza atanmış aktif bir site yok.' };
  }
  // Sakin: yalnız onaylı hesap portala girer (personel her zaman onaylıdır)
  if (isResident && profile.approval_status !== 'approved') {
    await sb.auth.signOut();
    return { error: 'Hesabınız henüz yönetici onayında. Onaylandığında giriş yapabilirsiniz.' };
  }

  await clearRateLimit(`login:${email.toLowerCase()}`);
  // Personel → yönetim paneli; sakin → salt-okunur portal
  redirect(isStaff ? '/' : '/portal');
}

export async function logout() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect('/login');
}
