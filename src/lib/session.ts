import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabaseServer';

export type ManagerSession = {
  userId: string;
  email: string;
  fullName: string | null;
  role: 'manager' | 'admin' | 'auditor';
  /** Denetçi (auditor) → salt-okuma. Tüm yazma kontrolleri UI'da gizlenir; DB'de RLS zaten engeller. */
  readOnly: boolean;
  /** Aktif site (aktif-işaretçi modeli: users.site_id). */
  siteId: string;
  siteName: string;
  /** Switcher için onaylı + aktif tüm site üyelikleri. */
  memberships: { siteId: string; siteName: string; role: string }[];
};

const STAFF_ROLES = ['manager', 'admin', 'auditor'];

/**
 * Geçerli oturumu okur ve kullanıcının panel-yetkili (manager/admin/auditor) olduğunu doğrular.
 * Profil, kullanıcının KENDİ satırından RLS ile okunur (service_role yok).
 * Yetkisizse veya aktif sitesi yoksa null döner. Denetçi salt-okuma erişir.
 */
export async function getManager(): Promise<ManagerSession | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from('users')
    .select('id, email, full_name, role, site_id')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  if (!profile.role || !STAFF_ROLES.includes(profile.role)) return null;
  if (!profile.site_id) return null;

  // Aktif site adı + üyelik listesi (RLS: kullanıcı kendi üyeliklerini ve sitesini görebilir)
  const [{ data: site }, { data: memberships }] = await Promise.all([
    sb.from('sites').select('id, name, deleted_at').eq('id', profile.site_id).single(),
    sb
      .from('site_memberships')
      .select('site_id, role, sites(name, deleted_at)')
      .eq('user_id', profile.id)
      .eq('approval_status', 'approved')
      .eq('is_active', true),
  ]);

  // Aktif site pasife alınmışsa (soft-delete) panel erişimi kesilir.
  if (!site || site.deleted_at) return null;

  return {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as 'manager' | 'admin' | 'auditor',
    readOnly: profile.role === 'auditor',
    siteId: profile.site_id,
    siteName: site?.name ?? '—',
    memberships: (memberships ?? [])
      .filter((m) => !(m.sites as { deleted_at?: string | null } | null)?.deleted_at)
      .map((m) => ({
        siteId: m.site_id,
        siteName: (m.sites as { name?: string } | null)?.name ?? '—',
        role: m.role,
      })),
  };
}

/** Korumalı sayfalarda: yönetici değilse /login'e yönlendirir. */
export async function requireManager(): Promise<ManagerSession> {
  const manager = await getManager();
  if (!manager) redirect('/login');
  return manager;
}
