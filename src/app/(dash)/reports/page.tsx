import { requireManager } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { ReportsHub } from '@/components/ReportsHub';
import { parseRange } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export default async function ReportsHubPage() {
  await requireManager();
  const { from, to } = parseRange({});
  return (
    <>
      <PageHeader title="Rapor Merkezi" subtitle="Bir rapora tıklayın — önizleyip Excel’e aktarabilirsiniz" />
      <ReportsHub defaultFrom={from} defaultTo={to} />
    </>
  );
}
