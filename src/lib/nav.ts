export type NavItem = { href: string; label: string; icon: string };
export type NavGroup = { title: string; items: NavItem[]; defaultCollapsed?: boolean };

/** Yönetici panelinin masaüstü navigasyonu — günlük işler üstte, kurulum altta. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Genel',
    items: [
      { href: '/', label: 'Panel', icon: '📊' },
    ],
  },
  {
    title: 'Sakinler',
    items: [
      { href: '/residents', label: 'Sakinler', icon: '👥' },
      { href: '/approvals', label: 'Onay Bekleyenler', icon: '✅' },
      { href: '/invitations', label: 'Davetler', icon: '✉️' },
      { href: '/units', label: 'Daireler', icon: '🏠' },
    ],
  },
  {
    title: 'Cari & Aidat',
    items: [
      { href: '/balances', label: 'Borç & Tahsilat', icon: '💰' },
      { href: '/accruals', label: 'Tahakkuk', icon: '🧾' },
      { href: '/unpaid', label: 'Ödemeyenler', icon: '⏳' },
    ],
  },
  {
    title: 'Kasa & Banka',
    items: [
      { href: '/cash', label: 'Kasa & Banka', icon: '🏦' },
    ],
  },
  {
    title: 'Raporlar',
    items: [
      { href: '/reports', label: 'Rapor Merkezi', icon: '📈' },
    ],
  },
  {
    title: 'İletişim',
    items: [
      { href: '/announcements', label: 'Duyurular', icon: '📣' },
      { href: '/complaints', label: 'Şikayetler', icon: '🛠️' },
    ],
  },
  {
    // Nadir kullanılan kurulum ekranları — ilk açılışta katlı gelir.
    title: 'Kurulum & Ayarlar',
    defaultCollapsed: true,
    items: [
      { href: '/charge-types', label: 'Tahakkuk Türleri', icon: '🏷️' },
      { href: '/dues-plans', label: 'Aidat Planları', icon: '📋' },
      { href: '/late-fee-policy', label: 'Gecikme Politikası', icon: '⚖️' },
      { href: '/blocks', label: 'Adalar / Bloklar', icon: '🏘️' },
      { href: '/excel', label: 'Excel Aktarım', icon: '📥' },
      { href: '/settings', label: 'Ayarlar', icon: '⚙️' },
    ],
  },
];
