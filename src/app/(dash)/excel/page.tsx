import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader, Card } from '@/components/ui';
import { BulkImportWizard } from '@/components/BulkImportWizard';
import { ExportButton } from '@/components/ExportButton';
import { loadImportSnapshot } from '@/lib/importSnapshot';

export const dynamic = 'force-dynamic';

type Counts = {
  inserted_units?: number; inserted_residents?: number; inserted_blocks?: number;
  updated_units?: number; updated_residents?: number; tenant_changes?: number;
  skipped_count?: number; total_rows?: number;
};

export default async function ExcelPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const [snapshot, { data: batches }] = await Promise.all([
    loadImportSnapshot(sb, manager.siteId),
    sb.from('import_batches')
      .select('id, filename, counts, created_at')
      .eq('site_id', manager.siteId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return (
    <>
      <PageHeader title="Excel Aktarım" subtitle="Toplu daire/sakin içe aktarma (senkronizasyon) ve tüm verilerin dışa aktarımı" />

      {/* Dışa aktarma — herkes (denetçi dahil) */}
      <div className="mb-6">
        <Card title="Dışa Aktarma">
          <p className="mb-3 text-sm text-slate-600">Sitenizin tüm verisi (daireler, sakinler, bakiyeler, tahakkuk, tahsilat, kasa/banka, duyuru, şikayet) tek bir çok-sayfalı Excel dosyasına aktarılır.</p>
          <ExportButton siteId={manager.siteId} />
        </Card>
      </div>

      {/* İçe aktarma — yalnız yazma yetkisi olanlar (denetçi göremez) */}
      {manager.readOnly ? (
        <Card title="İçe Aktarma">
          <p className="text-sm text-slate-500">Denetçi rolünde toplu içe aktarma yapılamaz (salt görünüm).</p>
        </Card>
      ) : (
        <div className="mb-6">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Toplu İçe Aktarma — Daire & Sakin</h2>
          <p className="mb-3 text-sm text-slate-600">Aynı Excel&apos;i tekrar yükleyerek <b>senkronize</b> edebilirsiniz: sistem neyin yeni, neyin değiştiğini bulur; hiçbir kayıt silinmez.</p>
          <BulkImportWizard snapshot={snapshot} siteId={manager.siteId} />
        </div>
      )}

      {/* İşlem geçmişi */}
      {(batches?.length ?? 0) > 0 && (
        <Card title="İçe Aktarma Geçmişi">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500">
                  <th className="py-1.5 pr-3">Tarih</th>
                  <th className="py-1.5 pr-3">Dosya</th>
                  <th className="py-1.5 pr-3">Eklenen</th>
                  <th className="py-1.5 pr-3">Güncellenen</th>
                  <th className="py-1.5 pr-3">Atlanan</th>
                  <th className="py-1.5">Toplam satır</th>
                </tr>
              </thead>
              <tbody>
                {(batches ?? []).map((b) => {
                  const c = (b.counts ?? {}) as Counts;
                  return (
                    <tr key={b.id} className="border-t border-slate-100 text-slate-700">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(b.created_at).toLocaleString('tr-TR')}</td>
                      <td className="py-1.5 pr-3 text-slate-500">{b.filename || '—'}</td>
                      <td className="py-1.5 pr-3">{(c.inserted_units ?? 0)} daire · {(c.inserted_residents ?? 0)} kişi</td>
                      <td className="py-1.5 pr-3">{(c.updated_units ?? 0) + (c.updated_residents ?? 0) + (c.tenant_changes ?? 0)}</td>
                      <td className="py-1.5 pr-3">{c.skipped_count ?? 0}</td>
                      <td className="py-1.5">{c.total_rows ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
