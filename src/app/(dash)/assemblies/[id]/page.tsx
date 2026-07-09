import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { AssemblyDetailPanel, type AssemblyDetail, type UnitRow } from '@/components/AssemblyDetailPanel';

export const dynamic = 'force-dynamic';

export default async function AssemblyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: detail }, { data: units }] = await Promise.all([
    sb.rpc('get_assembly_detail', { p_id: id }),
    sb.from('units').select('id, block, apartment_number').eq('site_id', manager.siteId).order('block').order('apartment_number'),
  ]);

  if (!detail) notFound();
  const d = detail as unknown as AssemblyDetail;

  return (
    <>
      <PageHeader
        title={d.title}
        subtitle="Gündem · uzaktan oy · katılım · tutanak"
        action={<Link href="/assemblies" className="text-sm text-blue-600 hover:underline">‹ Genel Kurul listesi</Link>}
      />
      <AssemblyDetailPanel
        canManage={manager.role === 'manager' || manager.role === 'admin'}
        detail={d}
        units={(units ?? []) as UnitRow[]}
      />
    </>
  );
}
