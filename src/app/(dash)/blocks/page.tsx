import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { BlocksPanel, type BlockRow, type Member } from '@/components/BlocksPanel';

export const dynamic = 'force-dynamic';

export default async function BlocksPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [blocksRes, unitsRes, membersRes] = await Promise.all([
    sb.from('blocks').select('id, name, manager_user_id, manager:manager_user_id(full_name)')
      .eq('site_id', manager.siteId).order('name', { ascending: true }),
    sb.from('units').select('ada_id').eq('site_id', manager.siteId),
    sb.from('users').select('id, full_name, role')
      .eq('site_id', manager.siteId).eq('approval_status', 'approved')
      .order('full_name', { ascending: true }),
  ]);

  const counts = new Map<string, number>();
  (unitsRes.data ?? []).forEach((u) => { if (u.ada_id) counts.set(u.ada_id, (counts.get(u.ada_id) ?? 0) + 1); });

  const rows = (blocksRes.data ?? []) as unknown as {
    id: string; name: string; manager_user_id: string | null; manager: { full_name: string } | null;
  }[];

  const blocks: BlockRow[] = rows.map((b) => ({
    id: b.id, name: b.name, manager_user_id: b.manager_user_id,
    manager_name: b.manager?.full_name ?? null, unit_count: counts.get(b.id) ?? 0,
  }));

  const members = (membersRes.data ?? []) as Member[];

  return (
    <>
      <PageHeader title="Adalar / Bloklar" subtitle="Büyük projeler için üst organizasyon katmanı. Ada silmek daireleri silmez; yalnız bağlarını boşaltır." />
      <BlocksPanel blocks={blocks} members={members} siteId={manager.siteId} />
    </>
  );
}
