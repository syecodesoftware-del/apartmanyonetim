import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { ComplaintsPanel, type ComplaintRow } from '@/components/ComplaintsPanel';

export const dynamic = 'force-dynamic';

const ORDER: Record<string, number> = { open: 0, in_progress: 1, resolved: 2, rejected: 3, closed: 4 };

export default async function ComplaintsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  // Maskeleme görünümü: anonim şikayetlerde user_id NULL gelir (kimlik yöneticiden gizli).
  const [{ data: complaints }, { data: converted }] = await Promise.all([
    sb.from('complaints_manager_view')
      .select('id, title, category, description, priority, status, resolution_note, resolved_at, user_id, is_anonymous, created_at, photos')
      .eq('site_id', manager.siteId)
      .order('created_at', { ascending: false }),
    sb.from('work_orders').select('source_complaint_id')
      .eq('site_id', manager.siteId).not('source_complaint_id', 'is', null),
  ]);
  const convertedIds = (converted ?? []).map((w) => w.source_complaint_id).filter(Boolean) as string[];

  const list = (complaints ?? []) as Omit<ComplaintRow, 'user_name' | 'user_unit'>[];

  // Şikayet sahibi adlarını ayrı çek (FK adı varsaymadan) ve eşle. Anonimlerde user_id NULL → ad yok.
  const userIds = Array.from(new Set(list.map((c) => c.user_id).filter(Boolean))) as string[];
  const nameMap = new Map<string, { name: string; unit: string }>();
  if (userIds.length) {
    const { data: users } = await sb.from('users').select('id, full_name, block, apartment_number').in('id', userIds);
    (users ?? []).forEach((u) => nameMap.set(u.id, {
      name: u.full_name,
      unit: [u.block, u.apartment_number].filter(Boolean).join(' / '),
    }));
  }

  const rows: ComplaintRow[] = list
    .map((c) => ({
      ...c,
      user_name: c.is_anonymous ? 'Anonim' : (c.user_id ? nameMap.get(c.user_id)?.name ?? '—' : '—'),
      user_unit: c.is_anonymous ? '' : (c.user_id ? nameMap.get(c.user_id)?.unit ?? '' : ''),
    }))
    .sort((a, b) => (ORDER[a.status ?? 'open'] ?? 9) - (ORDER[b.status ?? 'open'] ?? 9));

  const openCount = rows.filter((c) => c.status === 'open' || c.status === 'in_progress').length;

  return (
    <>
      <PageHeader title="Şikayetler" subtitle={`${openCount} açık/işlemde · toplam ${rows.length}`} />
      <ComplaintsPanel complaints={rows} managerId={manager.userId} convertedIds={convertedIds} />
    </>
  );
}
