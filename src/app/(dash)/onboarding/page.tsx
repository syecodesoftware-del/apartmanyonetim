import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { BulkImportWizard } from '@/components/BulkImportWizard';
import { loadImportSnapshot } from '@/lib/importSnapshot';
import { skipOnboarding } from '@/app/actions/onboarding';

export const dynamic = 'force-dynamic';

/** Onboarding — ilk veri girişi. Sitede 0 daire varken dashboard buraya yönlendirir;
 *  sonrasında /units içindeki "Toplu Aktarım" bölümünden her zaman ulaşılır. */
export default async function OnboardingPage() {
  const manager = await requireManager();
  if (manager.readOnly) redirect('/');

  const sb = await supabaseServer();
  const snapshot = await loadImportSnapshot(sb, manager.siteId);
  const unitCount = snapshot.length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-6 py-6">
        <h1 className="text-xl font-bold text-slate-900">
          {unitCount === 0 ? <>Hoş geldiniz 👋 — İlk adım: daireleri aktarın</> : <>Toplu Daire Aktarımı</>}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
          {manager.siteName} için daire listenizi Excel ile <b>tek seferde</b> aktarın: daireler, bloklar,
          mülk sahipleri ve kiracılar otomatik oluşturulur. Amaç 100 daireyi tek tek eklemek değil,
          <b> 2-3 dakikada eksiksiz aktarmak</b>.
        </p>
        <ol className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
          {['1 · Şablonu indir', '2 · Listeni şablona aktar ve yükle', '3 · Ekranda kontrol et & düzelt', '4 · Tek tıkla içe aktar'].map((s) => (
            <li key={s} className="rounded-full border border-blue-100 bg-white px-3 py-1.5">{s}</li>
          ))}
        </ol>
      </div>

      <BulkImportWizard snapshot={snapshot} siteId={manager.siteId} variant="inline" />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
        <Link href="/units" className="font-medium text-blue-600 hover:underline">
          Daireleri tek tek eklemek istiyorum →
        </Link>
        {unitCount === 0 && (
          <form action={skipOnboarding}>
            <button type="submit" className="font-medium text-slate-400 hover:text-slate-600 hover:underline">
              Şimdilik atla, panele git
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
