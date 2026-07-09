import { requireResident } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { Card, Badge, EmptyState } from '@/components/ui';
import { date } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PRIORITY: Record<string, { label: string; tone: 'slate' | 'blue' | 'amber' | 'red' }> = {
  low: { label: 'Bilgi', tone: 'slate' },
  normal: { label: 'Normal', tone: 'blue' },
  high: { label: 'Önemli', tone: 'amber' },
  urgent: { label: 'Acil', tone: 'red' },
};

type Announcement = { id: string; title: string; content: string; priority: string | null; is_pinned: boolean | null; created_at: string | null };

export default async function PortalAnnouncements() {
  const resident = await requireResident();
  const sb = await supabaseServer();

  const { data } = await sb
    .from('announcements')
    .select('id, title, content, priority, is_pinned, created_at')
    .eq('site_id', resident.siteId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (data ?? []) as Announcement[];

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? (
        <Card><EmptyState>Henüz duyuru yok.</EmptyState></Card>
      ) : (
        rows.map((a) => {
          const p = PRIORITY[a.priority ?? 'normal'] ?? PRIORITY.normal;
          return (
            <Card key={a.id}>
              <div className="mb-1.5 flex items-center gap-2">
                {a.is_pinned && <span title="Sabitlenmiş">📌</span>}
                <Badge tone={p.tone}>{p.label}</Badge>
                <span className="text-xs text-slate-400">{date(a.created_at)}</span>
              </div>
              <p className="text-base font-semibold text-slate-800">{a.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.content}</p>
            </Card>
          );
        })
      )}
    </div>
  );
}
