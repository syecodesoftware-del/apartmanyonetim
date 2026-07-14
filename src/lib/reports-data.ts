import 'server-only';
import type { supabaseServer } from './supabaseServer';
import type { ExportSheet } from '@/components/ReportControls';
import { toExclusive, donemLabel } from './reports';
import { nowIstanbulYearMonth } from './date';
import { date } from './format';

/**
 * Rapor Merkezi önizleme/indirme için ortak veri üreticileri.
 * NOT: Buradaki sorgu + hesaplama mantığı ilgili tam-sayfa raporlarının
 * (app/(dash)/reports/*) `sheets` mantığını birebir yansıtır; biri değişirse
 * diğeri de güncellenmeli.
 */

export type ReportKey = 'income-expense' | 'collections' | 'aging' | 'cash' | 'collection-rate' | 'dues-grid';
export type Range = { from: string; to: string };

type SB = Awaited<ReturnType<typeof supabaseServer>>;

const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', bank: 'Banka/Havale', online: 'Online', qr: 'QR' };
const TUR_LABEL: Record<string, string> = { nakit: 'Nakit Kasa', banka: 'Banka' };

type CollRow = {
  id: string;
  amount: number;
  method: string | null;
  paid_at: string | null;
  units: { block: string | null; apartment_number: string } | null;
};

function bucketLabel(months: number): string {
  if (months <= 1) return '0–1 ay';
  if (months <= 3) return '1–3 ay';
  return '3+ ay';
}

async function incomeExpense(sb: SB, siteId: string, r: Range): Promise<ExportSheet[]> {
  const toEx = toExclusive(r.to);
  const [{ data: collections }, { data: expenses }] = await Promise.all([
    sb.from('collections').select('amount, method, paid_at').eq('site_id', siteId).gte('paid_at', r.from).lt('paid_at', toEx),
    sb.from('cash_expenses').select('amount, category, spent_at').eq('site_id', siteId).gte('spent_at', r.from).lte('spent_at', r.to),
  ]);
  const inc = collections ?? [];
  const exp = expenses ?? [];
  const totalIncome = inc.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const totalExpense = exp.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const net = totalIncome - totalExpense;

  const byMethod = new Map<string, { count: number; amount: number }>();
  for (const c of inc) {
    const k = c.method ?? 'cash';
    const cur = byMethod.get(k) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(c.amount ?? 0);
    byMethod.set(k, cur);
  }
  const incomeRows = [...byMethod.entries()].map(([m, v]) => ({ yontem: METHOD_LABEL[m] ?? m, adet: v.count, tutar: v.amount })).sort((a, b) => b.tutar - a.tutar);

  const byCat = new Map<string, { count: number; amount: number }>();
  for (const e of exp) {
    const k = e.category?.trim() || 'Diğer';
    const cur = byCat.get(k) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(e.amount ?? 0);
    byCat.set(k, cur);
  }
  const expenseRows = [...byCat.entries()].map(([c, v]) => ({ kategori: c, adet: v.count, tutar: v.amount })).sort((a, b) => b.tutar - a.tutar);

  return [
    { name: 'Özet', rows: [{ 'Başlangıç': r.from, 'Bitiş': r.to, 'Toplam Gelir': totalIncome, 'Toplam Gider': totalExpense, 'Net': net }] },
    { name: 'Gelir (Yöntem)', rows: incomeRows.map((x) => ({ 'Yöntem': x.yontem, 'Adet': x.adet, 'Tutar': x.tutar })) },
    { name: 'Gider (Kategori)', rows: expenseRows.map((x) => ({ 'Kategori': x.kategori, 'Adet': x.adet, 'Tutar': x.tutar })) },
  ];
}

async function collectionsReport(sb: SB, siteId: string, r: Range): Promise<ExportSheet[]> {
  const toEx = toExclusive(r.to);
  const { data } = await sb
    .from('collections')
    .select('id, amount, method, paid_at, units(block, apartment_number)')
    .eq('site_id', siteId)
    .gte('paid_at', r.from).lt('paid_at', toEx)
    .order('paid_at', { ascending: false })
    .limit(2000);

  const rows = (data ?? []) as unknown as CollRow[];
  const total = rows.reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const unitLabel = (x: CollRow) => (x.units ? [x.units.block, x.units.apartment_number].filter(Boolean).join(' / ') : '—');

  const detail = rows.map((x) => ({
    'Tarih': x.paid_at ? date(x.paid_at) : '—',
    'Daire': unitLabel(x),
    'Yöntem': METHOD_LABEL[x.method ?? 'cash'] ?? x.method,
    'Tutar': Number(x.amount ?? 0),
  }));

  return [
    { name: 'Tahsilatlar', rows: detail },
    { name: 'Özet', rows: [{ 'Başlangıç': r.from, 'Bitiş': r.to, 'Kayıt': rows.length, 'Toplam': total }] },
  ];
}

type Bal = { unit_id: string; block: string | null; apartment_number: string | null; kalan_anapara: number | null; kalan_gecikme: number | null; toplam_borc: number | null };
type Acc = { unit_id: string; period_year: number; period_month: number };

async function aging(sb: SB, siteId: string): Promise<ExportSheet[]> {
  const [{ data: balances }, { data: accruals }] = await Promise.all([
    sb.from('unit_balances').select('unit_id, block, apartment_number, kalan_anapara, kalan_gecikme, toplam_borc').eq('site_id', siteId),
    sb.from('accruals').select('unit_id, period_year, period_month').eq('site_id', siteId).in('status', ['open', 'partial']),
  ]);

  const { year: nowYear, month: nowMonth } = nowIstanbulYearMonth();
  const nowIdx = nowYear * 12 + nowMonth;

  const oldest = new Map<string, number>();
  for (const a of (accruals ?? []) as Acc[]) {
    const idx = a.period_year * 12 + a.period_month;
    const cur = oldest.get(a.unit_id);
    if (cur === undefined || idx < cur) oldest.set(a.unit_id, idx);
  }

  const debtors = ((balances ?? []) as Bal[])
    .filter((b) => Number(b.toplam_borc ?? 0) > 0.005)
    .map((b) => {
      const o = oldest.get(b.unit_id);
      const months = o ? Math.max(0, nowIdx - o) : 0;
      const oy = o ? Math.floor((o - 1) / 12) : 0;
      const om = o ? ((o - 1) % 12) + 1 : 0;
      return {
        label: [b.block, b.apartment_number].filter(Boolean).join(' / ') || '—',
        anapara: Number(b.kalan_anapara ?? 0),
        gecikme: Number(b.kalan_gecikme ?? 0),
        toplam: Number(b.toplam_borc ?? 0),
        months,
        oldestLabel: o ? donemLabel(oy, om) : '—',
        bucket: bucketLabel(months),
      };
    })
    .sort((a, b) => b.toplam - a.toplam);

  const bucketSums = { '0–1 ay': 0, '1–3 ay': 0, '3+ ay': 0 } as Record<string, number>;
  for (const d of debtors) bucketSums[d.bucket] += d.toplam;

  return [
    { name: 'Borçlu Daireler', rows: debtors.map((d) => ({
      'Daire': d.label, 'Anapara': d.anapara, 'Gecikme': d.gecikme, 'Toplam Borç': d.toplam,
      'En Eski Açık Dönem': d.oldestLabel, 'Gecikme (ay)': d.months, 'Yaş': d.bucket,
    })) },
    { name: 'Yaş Özeti', rows: Object.entries(bucketSums).map(([k, v]) => ({ 'Yaş Aralığı': k, 'Toplam Borç': v })) },
  ];
}

type AccBal = { cash_account_id: string; ad: string | null; tur: string | null; is_active: boolean | null; balance: number | null };

async function cash(sb: SB, siteId: string, r: Range): Promise<ExportSheet[]> {
  const toEx = toExclusive(r.to);
  const [{ data: balances }, { data: collections }, { data: expenses }] = await Promise.all([
    sb.from('cash_account_balances').select('cash_account_id, ad, tur, is_active, balance').eq('site_id', siteId),
    sb.from('collections').select('cash_account_id, amount').eq('site_id', siteId).gte('paid_at', r.from).lt('paid_at', toEx),
    sb.from('cash_expenses').select('cash_account_id, amount').eq('site_id', siteId).gte('spent_at', r.from).lte('spent_at', r.to),
  ]);

  const inflow = new Map<string, number>();
  let unassignedIn = 0; // hesaba bağlanmamış tahsilatlar (ör. online/QR)
  for (const c of collections ?? []) {
    if (!c.cash_account_id) { unassignedIn += Number(c.amount ?? 0); continue; }
    inflow.set(c.cash_account_id, (inflow.get(c.cash_account_id) ?? 0) + Number(c.amount ?? 0));
  }
  const outflow = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (!e.cash_account_id) continue;
    outflow.set(e.cash_account_id, (outflow.get(e.cash_account_id) ?? 0) + Number(e.amount ?? 0));
  }

  const accounts = ((balances ?? []) as AccBal[]).map((a) => ({
    label: a.ad ?? 'Hesap',
    tur: TUR_LABEL[a.tur ?? ''] ?? a.tur,
    is_active: a.is_active,
    inflow: inflow.get(a.cash_account_id) ?? 0,
    outflow: outflow.get(a.cash_account_id) ?? 0,
    balance: Number(a.balance ?? 0),
  })).sort((a, b) => b.balance - a.balance);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const accountIn = accounts.reduce((s, a) => s + a.inflow, 0);
  const totalIn = accountIn + unassignedIn;
  const totalOut = accounts.reduce((s, a) => s + a.outflow, 0);

  return [
    { name: 'Hesap Durumu', rows: [
      ...accounts.map((a) => ({
        'Hesap': a.label, 'Tür': a.tur, 'Aktif': a.is_active ? 'Evet' : 'Hayır',
        'Dönem Giriş': a.inflow, 'Dönem Çıkış': a.outflow, 'Güncel Bakiye': a.balance,
      })),
      ...(unassignedIn > 0.005 ? [{
        'Hesap': 'Hesaba bağlanmamış', 'Tür': '—', 'Aktif': '—',
        'Dönem Giriş': unassignedIn, 'Dönem Çıkış': 0, 'Güncel Bakiye': 0,
      }] : []),
    ] },
    { name: 'Özet', rows: [{ 'Başlangıç': r.from, 'Bitiş': r.to, 'Toplam Giriş': totalIn, 'Hesap Girişi': accountIn, 'Hesaba Bağlanmamış': unassignedIn, 'Toplam Çıkış': totalOut, 'Toplam Bakiye': totalBalance }] },
  ];
}

type RateAcc = { period_year: number; period_month: number; amount: number | null; principal_remaining: number | null; status: string };

async function collectionRate(sb: SB, siteId: string): Promise<ExportSheet[]> {
  const { data } = await sb
    .from('accruals')
    .select('period_year, period_month, amount, principal_remaining, status')
    .eq('site_id', siteId)
    .limit(20000);

  const rows = (data ?? []) as RateAcc[];
  const map = new Map<string, { year: number; month: number; accrued: number; remaining: number; waived: number }>();
  for (const a of rows) {
    const key = `${a.period_year}-${String(a.period_month).padStart(2, '0')}`;
    const cur = map.get(key) ?? { year: a.period_year, month: a.period_month, accrued: 0, remaining: 0, waived: 0 };
    if (a.status === 'waived') {
      cur.waived += Number(a.amount ?? 0);
    } else {
      cur.accrued += Number(a.amount ?? 0);
      if (a.status === 'open' || a.status === 'partial') cur.remaining += Number(a.principal_remaining ?? 0);
    }
    map.set(key, cur);
  }

  const periods = [...map.values()]
    .map((v) => {
      const collected = v.accrued - v.remaining;
      const rate = v.accrued > 0 ? (collected / v.accrued) * 100 : 0;
      return { ...v, collected, rate, label: donemLabel(v.year, v.month) };
    })
    .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));

  const totAccrued = periods.reduce((s, p) => s + p.accrued, 0);
  const totCollected = periods.reduce((s, p) => s + p.collected, 0);
  const totWaived = periods.reduce((s, p) => s + p.waived, 0);
  const overallRate = totAccrued > 0 ? (totCollected / totAccrued) * 100 : 0;

  return [
    { name: 'Tahsilat Oranı', rows: periods.map((p) => ({
      'Dönem': p.label, 'Tahakkuk': p.accrued, 'Tahsil': p.collected, 'Kalan': p.remaining,
      'Vazgeçilen': p.waived, 'Oran (%)': Math.round(p.rate * 10) / 10,
    })) },
    { name: 'Genel', rows: [{ 'Toplam Tahakkuk': totAccrued, 'Toplam Tahsil': totCollected, 'Vazgeçilen': totWaived, 'Genel Oran (%)': Math.round(overallRate * 10) / 10 }] },
  ];
}

type GridAcc = { unit_id: string; period_month: number; status: string; amount: number | null; principal_remaining: number | null };
const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** Klasik "aidat çizelgesi": satır=daire, sütun=12 ay. Yıl, seçilen başlangıç tarihinden alınır.
 *  Hücre: ✓ ödendi · ◐ kısmi (kalan ₺) · ✗ açık (kalan ₺) · V vazgeçildi · — tahakkuk yok. */
async function duesGrid(sb: SB, siteId: string, r: Range): Promise<ExportSheet[]> {
  const year = Number(r.from.slice(0, 4));
  const [{ data: units }, { data: accruals }] = await Promise.all([
    sb.from('units').select('id, block, apartment_number').eq('site_id', siteId)
      .order('block', { ascending: true }).order('apartment_number', { ascending: true }),
    sb.from('accruals').select('unit_id, period_month, status, amount, principal_remaining')
      .eq('site_id', siteId).eq('period_year', year).not('period_month', 'is', null).limit(20000),
  ]);

  type Cell = { total: number; remaining: number; waivedOnly: boolean; any: boolean };
  const grid = new Map<string, Cell[]>();
  const cellOf = (unitId: string, m: number): Cell => {
    let arr = grid.get(unitId);
    if (!arr) { arr = Array.from({ length: 12 }, () => ({ total: 0, remaining: 0, waivedOnly: true, any: false })); grid.set(unitId, arr); }
    return arr[m - 1];
  };
  for (const a of (accruals ?? []) as GridAcc[]) {
    if (!a.period_month || a.period_month < 1 || a.period_month > 12) continue;
    const c = cellOf(a.unit_id, a.period_month);
    c.any = true;
    if (a.status === 'waived') continue;
    c.waivedOnly = false;
    c.total += Number(a.amount ?? 0);
    if (a.status === 'open' || a.status === 'partial') c.remaining += Number(a.principal_remaining ?? 0);
  }

  const fmt = (v: number) => Math.round(v).toLocaleString('tr-TR');
  const rows = (units ?? []).map((u) => {
    const cells = grid.get(u.id);
    const row: Record<string, unknown> = { 'Daire': [u.block, u.apartment_number].filter(Boolean).join(' / ') || '—' };
    let openTotal = 0;
    for (let m = 1; m <= 12; m++) {
      const c = cells?.[m - 1];
      let text = '—';
      if (c?.any) {
        if (c.waivedOnly) text = 'V';
        else if (c.remaining <= 0.005) text = '✓';
        else { text = `${c.remaining < c.total - 0.005 ? '◐' : '✗'} ${fmt(c.remaining)}`; openTotal += c.remaining; }
      }
      row[AY_KISA[m - 1]] = text;
    }
    row['Açık Toplam'] = Math.round(openTotal * 100) / 100;
    return row;
  });

  return [
    { name: `Aidat Çizelgesi ${year}`, rows },
    { name: 'Açıklama', rows: [
      { 'İşaret': '✓', 'Anlamı': 'Ödendi' },
      { 'İşaret': '◐ tutar', 'Anlamı': 'Kısmi ödendi — kalan tutar' },
      { 'İşaret': '✗ tutar', 'Anlamı': 'Ödenmedi — kalan tutar' },
      { 'İşaret': 'V', 'Anlamı': 'Vazgeçildi' },
      { 'İşaret': '—', 'Anlamı': 'O ay tahakkuk yok' },
    ] },
  ];
}

export async function buildReportSheets(sb: SB, siteId: string, key: ReportKey, range: Range): Promise<ExportSheet[]> {
  switch (key) {
    case 'income-expense': return incomeExpense(sb, siteId, range);
    case 'collections': return collectionsReport(sb, siteId, range);
    case 'aging': return aging(sb, siteId);
    case 'cash': return cash(sb, siteId, range);
    case 'collection-rate': return collectionRate(sb, siteId);
    case 'dues-grid': return duesGrid(sb, siteId, range);
    default: return [];
  }
}
