import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { money, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

type ActivityRow = {
  happened_at: string;
  kind: string;
  description: string;
  amount: number | null;
  actor_name: string | null;
};

const KIND_META: Record<string, { label: string; tone: 'green' | 'red' | 'blue' | 'amber' | 'slate' }> = {
  tahsilat: { label: 'Tahsilat', tone: 'green' },
  gider: { label: 'Gider', tone: 'red' },
  virman: { label: 'Virman', tone: 'blue' },
  fatura: { label: 'Fatura', tone: 'amber' },
  is_emri: { label: 'İş Emri', tone: 'blue' },
  duyuru: { label: 'Duyuru', tone: 'slate' },
  icra: { label: 'Takip/İcra', tone: 'amber' },
};

/** Rapor #29: "bu tahsilatı kim girdi, dün kim ne yaptı" — muhasebeci + yönetici birlikte
 *  çalışırken güven ve ihtilaf çözümü için birleşik işlem geçmişi. */
export default async function ActivityPage() {
  await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb.rpc('get_recent_activity', { p_limit: 100 });
  const rows = (data ?? []) as ActivityRow[];

  return (
    <>
      <PageHeader
        title="Son İşlemler"
        subtitle="Kim, ne zaman, ne yaptı — tahsilat, gider, virman, fatura, iş emri, duyuru ve takip kayıtları tek listede (son 100)"
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState>Henüz kayıtlı işlem yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Zaman</Th>
                <Th>Tür</Th>
                <Th>İşlem</Th>
                <Th className="text-right">Tutar</Th>
                <Th>Yapan</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const meta = KIND_META[r.kind] ?? { label: r.kind, tone: 'slate' as const };
                return (
                  <tr key={i}>
                    <Td className="whitespace-nowrap text-slate-400">{dateTime(r.happened_at)}</Td>
                    <Td><Badge tone={meta.tone}>{meta.label}</Badge></Td>
                    <Td>{r.description}</Td>
                    <Td className="text-right tabular-nums">{r.amount != null ? money(Number(r.amount), true) : '—'}</Td>
                    <Td className="text-slate-500">{r.actor_name ?? '—'}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        Not: Tahsilat iptali ve tahakkuk geri alma gibi kritik işlemler ayrıca tüm yöneticilere bildirim olarak düşer.
      </p>
    </>
  );
}
