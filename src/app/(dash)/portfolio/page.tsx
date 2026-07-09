import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { PortfolioPanel, type Company, type PortfolioRow } from '@/components/PortfolioPanel';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const { data: companies } = await sb.rpc('get_my_companies');
  const list = (companies ?? []) as Company[];

  let rows: PortfolioRow[] = [];
  if (list.length > 0) {
    const { data: p } = await sb.rpc('get_company_portfolio', {});
    rows = (p ?? []) as PortfolioRow[];
  }

  return (
    <>
      <PageHeader
        title="Firma Portföyü"
        subtitle="Yönetim firmanıza bağlı tüm sitelerin mali özeti — tahakkuk, tahsilat, açık borç, kasa ve banka"
      />
      <PortfolioPanel
        companies={list}
        rows={rows}
        activeSiteId={manager.siteId}
        activeSiteName={manager.siteName}
      />
    </>
  );
}
