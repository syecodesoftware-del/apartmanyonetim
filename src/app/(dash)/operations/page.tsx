import Link from 'next/link';
import { requireManager } from '@/lib/session';
import { PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

const OPS = [
  { href: '/work-orders', icon: '🔧', title: 'İş Takibi', desc: 'Arıza ve bakım işleri: aç, ata, tamamla.' },
  { href: '/gate', icon: '🚪', title: 'Kapı & Ziyaretçi', desc: 'Ziyaretçi kodları, plaka listesi, kargo bildirimi.' },
  { href: '/meters', icon: '⏲️', title: 'Sayaçlar', desc: 'Su/elektrik/ısı sayaç okumaları.' },
  { href: '/inventory', icon: '📦', title: 'Demirbaş & Envanter', desc: 'Demirbaş listesi, asansör muayene uyarıları.' },
  { href: '/staff', icon: '👷', title: 'Personel', desc: 'Görevli kayıtları ve haftalık vardiya çizelgesi.' },
  { href: '/suppliers', icon: '🧾', title: 'Tedarikçi & Fatura', desc: 'Tedarikçiler, fatura onayı ve ödeme kuyruğu.' },
  { href: '/archive', icon: '🗂️', title: 'Belge Arşivi', desc: 'Sözleşme, proje, ruhsat gibi site belgeleri.' },
];

/** Operasyon ekranlarının tek giriş kapısı — menüde 7 sekme yerine 1 sekme. */
export default async function OperationsPage() {
  await requireManager();

  return (
    <>
      <PageHeader title="Operasyon" subtitle="Sahadaki günlük işlerin tamamı — bir kart seçin" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OPS.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{o.icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{o.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{o.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
