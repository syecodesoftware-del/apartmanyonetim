export type NavItem = { href: string; label: string; icon: string };
export type NavGroup = { title: string; items: NavItem[] };

/** Yönetici panelinin masaüstü navigasyonu — fazlara göre gruplu. */
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
      { href: '/blocks', label: 'Adalar / Bloklar', icon: '🏘️' },
      { href: '/excel', label: 'Excel Aktarım', icon: '📊' },
    ],
  },
  {
    title: 'Cari & Aidat',
    items: [
      { href: '/balances', label: 'Borç & Tahsilat', icon: '💰' },
      { href: '/accruals', label: 'Tahakkuk', icon: '🧾' },
      { href: '/unpaid', label: 'Ödemeyenler', icon: '⏳' },
      { href: '/charge-types', label: 'Gider Türleri', icon: '🏷️' },
      { href: '/dues-plans', label: 'Aidat Planları', icon: '📋' },
      { href: '/late-fee-policy', label: 'Gecikme Politikası', icon: '⚖️' },
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
      { href: '/reports/income-expense', label: 'Gelir–Gider', icon: '⚖️' },
      { href: '/reports/collections', label: 'Tahsilat', icon: '💵' },
      { href: '/reports/aging', label: 'Borç Yaşlandırma', icon: '📅' },
      { href: '/reports/cash', label: 'Kasa & Banka', icon: '🏦' },
      { href: '/reports/collection-rate', label: 'Tahsilat Oranı', icon: '🎯' },
    ],
  },
  {
    title: 'İletişim & Ayarlar',
    items: [
      { href: '/announcements', label: 'Duyurular', icon: '📣' },
      { href: '/complaints', label: 'Şikayetler', icon: '🛠️' },
      { href: '/settings', label: 'Ayarlar', icon: '⚙️' },
    ],
  },
];
