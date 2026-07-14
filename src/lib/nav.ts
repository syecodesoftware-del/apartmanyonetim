export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Bu ön eklerden biriyle eşleşen her sayfa bu sekmeyi aktif gösterir (tab kümeleri + eski rotalar). */
  match?: string[];
  /** Yalnız birden çok site üyeliği olan (firma) kullanıcılara gösterilir. */
  portfolioOnly?: boolean;
};

/** Düz, kısa menü — her satır bir iş alanı. İlişkili alt ekranlar sayfa üstündeki
 *  sekme çubuğundan (ClusterTabs) erişilir; hiçbir eski rota silinmedi. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Özet Ekranı', icon: '📊' },
  {
    href: '/units', label: 'Daireler & Sakinler', icon: '🏠',
    match: ['/units', '/residents', '/balances', '/unpaid', '/onboarding'],
  },
  { href: '/approvals', label: 'Başvuru & Davetler', icon: '✉️', match: ['/approvals', '/invitations'] },
  {
    href: '/accruals', label: 'Tahakkuk & Aidat', icon: '🧾',
    match: ['/accruals', '/charge-types', '/dues-plans', '/late-fee-policy'],
  },
  { href: '/cash', label: 'Kasa & Banka', icon: '🏦', match: ['/cash'] },
  { href: '/enforcement', label: 'Takip & İcra', icon: '⚖️', match: ['/enforcement'] },
  {
    href: '/reports', label: 'Raporlar & Defterler', icon: '📈',
    match: ['/reports', '/ledger', '/budget', '/documents', '/activity'],
  },
  {
    href: '/announcements', label: 'İletişim', icon: '📣',
    match: ['/announcements', '/messages', '/complaints', '/community'],
  },
  { href: '/assemblies', label: 'Genel Kurul & Kararlar', icon: '🗳️', match: ['/assemblies', '/decisions'] },
  {
    href: '/operations', label: 'Operasyon', icon: '🔧',
    match: ['/operations', '/work-orders', '/gate', '/meters', '/inventory', '/staff', '/suppliers', '/archive'],
  },
  { href: '/portfolio', label: 'Firma Portföyü', icon: '🏢', portfolioOnly: true },
  { href: '/settings', label: 'Ayarlar', icon: '⚙️', match: ['/settings', '/blocks', '/excel', '/consent'] },
];
