import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { DocumentsPanel, type Occupant, type SiteInfo } from '@/components/DocumentsPanel';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: site }, { data: occupants }] = await Promise.all([
    sb.from('sites').select('name, address, city, district, site_code').eq('id', manager.siteId).single(),
    sb.from('current_occupants')
      .select('unit_id, block, apartment_number, user_id, full_name, relationship, phone, tc_kimlik, toplam_borc, kalan_anapara, kalan_gecikme')
      .eq('site_id', manager.siteId)
      .order('apartment_number'),
  ]);

  return (
    <>
      <PageHeader
        title="Hazır Dökümanlar"
        subtitle="Borçsuzluk belgesi · ihtar yazısı · avukat devir formu — verilerden otomatik doldurulur, yazdır/PDF"
      />
      <DocumentsPanel
        site={(site ?? null) as SiteInfo | null}
        occupants={(occupants ?? []) as Occupant[]}
        managerName={manager.fullName}
      />
    </>
  );
}
