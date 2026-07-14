import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { SuppliersPanel, type Supplier, type Invoice, type QueueItem, type AccountOption } from '@/components/SuppliersPanel';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: suppliers }, { data: invoices }, { data: queue }, { data: accounts }] = await Promise.all([
    sb.rpc('get_suppliers', { p_include_inactive: false }),
    sb.rpc('get_supplier_invoices', { p_status: undefined, p_supplier_id: undefined }),
    sb.rpc('get_payment_queue'),
    sb.from('cash_accounts').select('id, ad, tur').eq('site_id', manager.siteId).eq('is_active', true).order('created_at', { ascending: true }),
  ]);

  return (
    <>
      <PageHeader
        title="Tedarikçi & Fatura"
        subtitle="Tedarikçileri yönetin, faturaları onaya sunun, ödeme kuyruğunu takip edin — onay yalnız yöneticide"
      />
      <SuppliersPanel
        canApprove={manager.role === 'manager' || manager.role === 'admin'}
        suppliers={(suppliers ?? []) as unknown as Supplier[]}
        invoices={(invoices ?? []) as unknown as Invoice[]}
        queue={(queue ?? []) as unknown as QueueItem[]}
        accounts={(accounts ?? []) as AccountOption[]}
      />
    </>
  );
}
