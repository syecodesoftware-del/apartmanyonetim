import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { ArchivePanel, type SiteDocument } from '@/components/ArchivePanel';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data } = await sb.rpc('get_site_documents', {
    p_category: undefined, p_entity_type: undefined, p_entity_id: undefined,
  });

  return (
    <>
      <PageHeader
        title="Belge Arşivi"
        subtitle="Sözleşme, tutanak, fatura, ruhsat ve sigorta belgelerini tek yerde saklayın — özel (private) depolama"
      />
      <ArchivePanel siteId={manager.siteId} documents={(data ?? []) as unknown as SiteDocument[]} />
    </>
  );
}
