import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { MessagesPanel, type DmThread } from '@/components/MessagesPanel';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb.rpc('get_dm_threads');

  return (
    <>
      <PageHeader
        title="Mesajlar"
        subtitle="Sakinlerle birebir yazışma — sakin uygulamadan yazar, yanıtınız anında bildirim olarak gider"
      />
      <MessagesPanel threads={(data ?? []) as unknown as DmThread[]} />
    </>
  );
}
