import Link from 'next/link';
import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { UnitsPanel, type UnitRow, type BlockOption } from '@/components/UnitsPanel';

export const dynamic = 'force-dynamic';

export default async function UnitsPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [unitsRes, blocksRes] = await Promise.all([
    sb.from('units').select('id, block, apartment_number, floor, arsa_payi, m2, ada_id')
      .eq('site_id', manager.siteId)
      .order('block', { ascending: true }).order('apartment_number', { ascending: true }),
    sb.from('blocks').select('id, name').eq('site_id', manager.siteId).order('name', { ascending: true }),
  ]);

  const units = (unitsRes.data ?? []) as UnitRow[];
  const blockOptions = (blocksRes.data ?? []) as BlockOption[];

  return (
    <>
      <PageHeader title="Daireler" subtitle={`${units.length} daire`} />

      {/* Onboarding'deki toplu aktarıma kalıcı erişim — ilk girişte yönlendirilen ekranın aynısı */}
      {!manager.readOnly && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-blue-900">📥 Excel ile Toplu Daire Aktarımı</p>
            <p className="text-xs text-blue-700">
              Daire listenizi (bloklar, mülk sahipleri, kiracılar dahil) Excel dosyasından tek seferde aktarın.
              Mevcut daireler etkilenmez; yalnızca yeni olanlar eklenir.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >Toplu Aktarıma Git →</Link>
        </div>
      )}

      <UnitsPanel units={units} blockOptions={blockOptions} siteId={manager.siteId} />
    </>
  );
}
