const TRY = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
const TRY2 = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });

export function money(value: number | null | undefined, decimals = false): string {
  const n = Number(value ?? 0);
  return decimals ? TRY2.format(n) : TRY.format(n);
}

export function date(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const ROLE_LABEL: Record<string, string> = {
  resident: 'Sakin',
  manager: 'Yönetici',
  accountant: 'Muhasebeci',
  auditor: 'Denetçi',
  admin: 'Admin',
};

export const APPROVAL_LABEL: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
};
