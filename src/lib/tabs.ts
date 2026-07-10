export type TabItem = { href: string; label: string };
export type TabCluster = { title: string; items: TabItem[] };

/** Birbiriyle ilişkili ekran kümeleri — ClusterTabs bu listeye bakarak sayfanın üstünde
 *  sekme çubuğu gösterir. Menü sadeleşirken hiçbir rota silinmedi; kümeler eski
 *  sekmeleri tek çatı altında erişilebilir tutar. */
export const TAB_CLUSTERS: TabCluster[] = [
  {
    title: 'Tahakkuk & Aidat',
    items: [
      { href: '/accruals', label: 'Borç Tahakkuku' },
      { href: '/charge-types', label: 'Tahakkuk Türleri' },
      { href: '/dues-plans', label: 'Aidat Planları' },
      { href: '/late-fee-policy', label: 'Gecikme Politikası' },
    ],
  },
  {
    title: 'Raporlar & Defterler',
    items: [
      { href: '/reports', label: 'Rapor Merkezi' },
      { href: '/ledger', label: 'İşletme Defteri' },
      { href: '/budget', label: 'İşletme Projesi' },
      { href: '/documents', label: 'Hazır Dökümanlar' },
    ],
  },
  {
    title: 'İletişim',
    items: [
      { href: '/announcements', label: 'Duyurular' },
      { href: '/messages', label: 'Mesajlar' },
      { href: '/complaints', label: 'Şikayetler' },
      { href: '/community', label: 'Topluluk & Kampanya' },
    ],
  },
  {
    title: 'Genel Kurul & Kararlar',
    items: [
      { href: '/assemblies', label: 'Genel Kurul' },
      { href: '/decisions', label: 'Karar Defteri' },
    ],
  },
  {
    title: 'Operasyon',
    items: [
      { href: '/operations', label: 'Genel Bakış' },
      { href: '/work-orders', label: 'İş Takibi' },
      { href: '/gate', label: 'Kapı & Ziyaretçi' },
      { href: '/meters', label: 'Sayaçlar' },
      { href: '/inventory', label: 'Demirbaş' },
      { href: '/staff', label: 'Personel' },
      { href: '/suppliers', label: 'Tedarikçi & Fatura' },
      { href: '/archive', label: 'Belge Arşivi' },
    ],
  },
  {
    title: 'Ayarlar',
    items: [
      { href: '/settings', label: 'Site & Üyelik' },
      { href: '/blocks', label: 'Adalar / Bloklar' },
      { href: '/excel', label: 'Excel Aktarım' },
    ],
  },
];

export function matchesPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function findCluster(pathname: string): TabCluster | null {
  return TAB_CLUSTERS.find((c) => c.items.some((it) => matchesPath(pathname, it.href))) ?? null;
}
