import { requireManager } from '@/lib/session';
import { PageHeader, Card } from '@/components/ui';
import { ImportPanel } from '@/components/ImportPanel';
import { ExportButton } from '@/components/ExportButton';

export const dynamic = 'force-dynamic';

export default async function ExcelPage() {
  const manager = await requireManager();

  return (
    <>
      <PageHeader title="Excel Aktarım" subtitle="Toplu daire/sakin içe aktarma ve tüm verilerin dışa aktarımı" />

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
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Toplu İçe Aktarma — Daire & Sakin</h2>
          <ImportPanel />
        </div>
      )}
    </>
  );
}
