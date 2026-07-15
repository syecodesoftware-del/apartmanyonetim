import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { ConsentPanel, type ConsentPerson, type ConsentRecord } from '@/components/ConsentPanel';

export const dynamic = 'force-dynamic';

export default async function ConsentPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: occ }, { data: forms }] = await Promise.all([
    sb.from('current_occupants')
      .select('tenancy_id, full_name, relationship, block, apartment_number, phone, email')
      .eq('site_id', manager.siteId)
      .order('block')
      .order('apartment_number'),
    sb.from('consent_forms')
      .select('tenancy_id, status, generated_at')
      .eq('site_id', manager.siteId)
      .order('generated_at', { ascending: false }),
  ]);

  const people = (occ ?? []).map((o): ConsentPerson => ({
    tenancy_id: o.tenancy_id!,
    full_name: o.full_name ?? '',
    relationship: o.relationship ?? '',
    block: o.block,
    apartment_number: o.apartment_number ?? '',
    phone: o.phone,
    email: o.email,
  }));
  const records = (forms ?? []) as ConsentRecord[];

  return (
    <>
      <PageHeader
        title="KVKK Açık Rıza Formları"
        subtitle="Uygulamayı kullanmayan sakinler için kişiye özel açık rıza formu oluşturun, yazdırın ve arşivleyin."
      />
      <ConsentPanel
        people={people}
        records={records}
        siteId={manager.siteId}
        siteName={manager.siteName}
        managerUserId={manager.userId}
      />
    </>
  );
}
