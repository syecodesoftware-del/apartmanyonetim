import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, Card } from '@/components/ui';
import { ResidentsTable, type OccupantRow } from '@/components/ResidentsTable';

export const dynamic = 'force-dynamic';

export default async function ResidentsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  // Birleşik kaynak: current_occupants (güncel malik + kiracı, hesaplı + hesapsız)
  const { data } = await sb
    .from('current_occupants')
    .select(
      'tenancy_id, unit_id, block, apartment_number, relationship, full_name, phone, email, account_role, has_account, toplam_borc',
    )
    .eq('site_id', manager.siteId)
    .order('apartment_number', { ascending: true });

  const occupants = (data ?? []) as OccupantRow[];
  const withoutAccount = occupants.filter((o) => !o.has_account).length;

  return (
    <>
      <PageHeader
        title="Sakinler"
        subtitle={`${occupants.length} güncel sakin · ${withoutAccount} kişi mobil uygulamayı kullanmıyor`}
      />
      <Card>
        <ResidentsTable occupants={occupants} />
      </Card>
    </>
  );
}
