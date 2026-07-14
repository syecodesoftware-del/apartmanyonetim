import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { Sidebar } from '@/components/Sidebar';
import { SiteSwitcher } from '@/components/SiteSwitcher';
import { LogoutButton } from '@/components/LogoutButton';
import { ReadOnlyProvider } from '@/components/ReadOnly';
import { NavProvider } from '@/components/NavProvider';
import { MobileMenuButton } from '@/components/MobileMenuButton';
import { ClusterTabs } from '@/components/ClusterTabs';
import { GlobalSearch } from '@/components/GlobalSearch';
import { GateOnlyGuard } from '@/components/GateOnlyGuard';

export default async function DashLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const manager = await requireManager();
  const sb = await supabaseServer();

  // Menü rozetleri: bekleyen başvuru + (açık şikayet + okunmamış mesaj → İletişim)
  // Görevli hesabında bu modüllerin RPC'leri yetkisiz döner — hiç sorgulanmaz.
  let pendingApprovals = 0, openComplaints = 0, unreadDm = 0;
  if (!manager.gateOnly) {
    const [approvalsRes, complaintsRes, dmRes] = await Promise.all([
      sb.from('users').select('*', { count: 'exact', head: true })
        .eq('site_id', manager.siteId).eq('approval_status', 'pending'),
      sb.from('complaints').select('*', { count: 'exact', head: true })
        .eq('site_id', manager.siteId).in('status', ['open', 'in_progress']),
      sb.rpc('get_dm_threads'),
    ]);
    pendingApprovals = approvalsRes.count ?? 0;
    openComplaints = complaintsRes.count ?? 0;
    unreadDm = ((dmRes.data ?? []) as { unread: number }[]).reduce((s, t) => s + Number(t.unread ?? 0), 0);
  }

  return (
    <ReadOnlyProvider value={manager.readOnly}>
      <NavProvider>
      {manager.gateOnly && <GateOnlyGuard />}
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar
          siteName={manager.siteName}
          showPortfolio={manager.memberships.length > 1}
          gateOnly={manager.gateOnly}
          badges={{ '/approvals': pendingApprovals, '/announcements': openComplaints + unreadDm }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center">
              <MobileMenuButton />
              <SiteSwitcher memberships={manager.memberships} activeSiteId={manager.siteId} />
            </div>
            <div className="flex items-center gap-3">
              {!manager.gateOnly && <GlobalSearch />}
              {manager.gateOnly && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Kapı Görevlisi
                </span>
              )}
              {manager.readOnly && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Denetçi — salt görünüm
                </span>
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{manager.fullName ?? manager.email}</p>
                <p className="text-xs text-slate-400">{manager.email}</p>
              </div>
              <LogoutButton />
            </div>
          </header>
          {manager.readOnly && (
            <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-700">
              Denetçi rolündesiniz: tüm veriyi görüntüleyebilir, hiçbir değişiklik yapamazsınız. Düzenleme kontrolleri gizlidir.
            </div>
          )}
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {!manager.gateOnly && <ClusterTabs />}
            {children}
          </main>
          {modal}
        </div>
      </div>
      </NavProvider>
    </ReadOnlyProvider>
  );
}
