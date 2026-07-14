import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { AnnouncementsPanel, type AnnouncementRow } from '@/components/AnnouncementsPanel';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data }, { data: unitBlocks }] = await Promise.all([
    sb
      .from('announcements')
      .select('id, title, content, priority, is_pinned, target_block, created_at, author:users!announcements_created_by_fkey(full_name)')
      .eq('site_id', manager.siteId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('units').select('block').eq('site_id', manager.siteId).not('block', 'is', null),
  ]);

  const ids = (data ?? []).map((a) => a.id);
  // Okunma sayıları (rapor #35): staff, kendi sitesinin duyuru okunmalarını görebilir (RLS).
  const { data: reads } = ids.length
    ? await sb.from('announcement_reads').select('announcement_id').in('announcement_id', ids)
    : { data: [] as { announcement_id: string }[] };
  const readCount = new Map<string, number>();
  for (const r of reads ?? []) readCount.set(r.announcement_id, (readCount.get(r.announcement_id) ?? 0) + 1);

  const rows = (data ?? []).map((a) => ({
    id: a.id, title: a.title, content: a.content, priority: a.priority,
    is_pinned: a.is_pinned, target_block: a.target_block, created_at: a.created_at,
    author_name: (a.author as { full_name?: string } | null)?.full_name ?? null,
    read_count: readCount.get(a.id) ?? 0,
  })) as AnnouncementRow[];

  const blockNames = [...new Set((unitBlocks ?? []).map((u) => u.block).filter((b): b is string => !!b))]
    .sort((a, b) => a.localeCompare(b, 'tr'));

  return (
    <>
      <PageHeader title="Duyurular" subtitle="Site sakinlerine duyuru yayınla (yeni duyuru otomatik bildirim gönderir)" />
      <AnnouncementsPanel announcements={rows} siteId={manager.siteId} managerId={manager.userId} blockNames={blockNames} />
    </>
  );
}
