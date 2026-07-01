import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { AnnouncementsPanel, type AnnouncementRow } from '@/components/AnnouncementsPanel';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('announcements')
    .select('id, title, content, priority, is_pinned, created_at, author:users!announcements_created_by_fkey(full_name)')
    .eq('site_id', manager.siteId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (data ?? []).map((a) => ({
    id: a.id, title: a.title, content: a.content, priority: a.priority,
    is_pinned: a.is_pinned, created_at: a.created_at,
    author_name: (a.author as { full_name?: string } | null)?.full_name ?? null,
  })) as AnnouncementRow[];

  return (
    <>
      <PageHeader title="Duyurular" subtitle="Site sakinlerine duyuru yayınla (yeni duyuru otomatik bildirim gönderir)" />
      <AnnouncementsPanel announcements={rows} siteId={manager.siteId} managerId={manager.userId} />
    </>
  );
}
