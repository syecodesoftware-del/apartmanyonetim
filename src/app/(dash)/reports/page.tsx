import Link from 'next/link';
import { requireManager } from '@/lib/session';
import { PageHeader, Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

const REPORTS = [
  { href: '/reports/income-expense', icon: '⚖️', title: 'Gelir–Gider', desc: 'Dönemsel tahsilat ve giderler, kategori kırılımı, net durum.' },
  { href: '/reports/collections', icon: '💵', title: 'Tahsilat Raporu', desc: 'Dönemdeki tüm tahsilatlar — daire, yöntem ve tarih bazlı döküm.' },
  { href: '/reports/aging', icon: '📅', title: 'Borç Yaşlandırma', desc: 'Güncel borçlar: anapara/gecikme kırılımı, borçlu daireler.' },
  { href: '/reports/cash', icon: '🏦', title: 'Kasa & Banka Durumu', desc: 'Hesap bazında güncel bakiye ve dönem hareket özeti.' },
  { href: '/reports/collection-rate', icon: '🎯', title: 'Tahsilat Oranı', desc: 'Dönem bazında tahakkuk vs tahsil yüzdesi.' },
];

export default async function ReportsHubPage() {
  await requireManager();
  return (
    <>
      <PageHeader title="Rapor Merkezi" subtitle="Site raporları — tarih aralığı seçip Excel'e aktarabilirsiniz" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="block">
            <Card>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{r.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
