export type NavItem = { href: string; label: string; icon: string };
export type NavGroup = { title: string; items: NavItem[]; defaultCollapsed?: boolean };

/** Yönetici panelinin masaüstü navigasyonu — günlük işler üstte, kurulum altta. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Genel',
    items: [
      { href: '/', label: 'Panel', icon: '📊' },
      { href: '/portfolio', label: 'Firma Portföyü', icon: '🏢' },
    ],
  },
  {
    title: 'Sakinler',
    items: [
      { href: '/residents', label: 'Sakinler', icon: '👥' },
      { href: '/approvals', label: 'Başvuru & Davetler', icon: '✉️' },
      { href: '/units', label: 'Daireler', icon: '🏠' },
    ],
  },
  {
    title: 'Cari & Aidat',
    items: [
      { href: '/balances', label: 'Borç & Tahsilat', icon: '💰' },
      { href: '/budget', label: 'İşletme Projesi', icon: '📊' },
      { href: '/accruals', label: 'Tahakkuk', icon: '🧾' },
      { href: '/unpaid', label: 'Ödemeyenler', icon: '⏳' },
      { href: '/enforcement', label: 'Takip & İcra', icon: '⚖️' },
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
      { href: '/ledger', label: 'İşletme Defteri', icon: '📒' },
      { href: '/documents', label: 'Hazır Dökümanlar', icon: '📄' },
    ],
  },
  {
    title: 'İletişim',
    items: [
      { href: '/announcements', label: 'Duyurular', icon: '📣' },
      { href: '/messages', label: 'Mesajlar', icon: '💬' },
      { href: '/community', label: 'Topluluk & Kampanya', icon: '🏪' },
      { href: '/complaints', label: 'Şikayetler', icon: '🛠️' },
    ],
  },
  {
    title: 'Yönetişim',
    items: [
      { href: '/assemblies', label: 'Genel Kurul', icon: '🗳️' },
      { href: '/decisions', label: 'Karar Defteri', icon: '📖' },
    ],
  },
  {
    title: 'Operasyon',
    items: [
      { href: '/gate', label: 'Kapı & Ziyaretçi', icon: '🚪' },
      { href: '/work-orders', label: 'İş Takibi', icon: '🔧' },
      { href: '/meters', label: 'Sayaçlar', icon: '⏲️' },
      { href: '/inventory', label: 'Demirbaş & Envanter', icon: '📦' },
      { href: '/staff', label: 'Personel', icon: '👷' },
      { href: '/suppliers', label: 'Tedarikçi & Fatura', icon: '🧾' },
      { href: '/archive', label: 'Belge Arşivi', icon: '🗂️' },
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
