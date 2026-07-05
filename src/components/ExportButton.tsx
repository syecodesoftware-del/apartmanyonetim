'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { buildExportBlob, downloadBlob } from '@/lib/excel';
import { todayLocalISO } from '@/lib/date';

/** Modül 4 — Tüm site verisini çok-sheet'li Excel olarak dışa aktarır.
 *  RLS sayesinde yalnız kendi sitenin verisi gelir; denetçi de kullanabilir (okuma). */
export function ExportButton({ siteId }: { siteId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmtDate = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString('tr-TR') : '');
  const fmtDateTime = (v: unknown) => (v ? new Date(String(v)).toLocaleString('tr-TR') : '');

  async function run() {
    setBusy(true); setError(null);
    const sb = supabaseBrowser();
    try {
      const [units, tenancies, balances, accruals, collections, expenses, bank, announcements, complaints, chargeTypes] = await Promise.all([
        sb.from('units').select('block, apartment_number, floor, arsa_payi').eq('site_id', siteId).order('block').order('apartment_number'),
        sb.from('tenancies').select('relationship, full_name, tc_kimlik, phone, start_date, end_date, units(block, apartment_number)').eq('site_id', siteId),
        sb.from('unit_balances').select('block, apartment_number, kalan_anapara, kalan_gecikme, toplam_borc').eq('site_id', siteId),
        sb.from('accruals').select('period_year, period_month, amount, principal_remaining, status, due_date, description, units(block, apartment_number)').eq('site_id', siteId),
        sb.from('collections').select('amount, method, paid_at, units(block, apartment_number)').eq('site_id', siteId),
        sb.from('cash_expenses').select('amount, category, description, spent_at').eq('site_id', siteId),
        sb.from('bank_transactions').select('txn_date, direction, amount, description, counterparty, match_status').eq('site_id', siteId),
        sb.from('announcements').select('title, content, priority, is_pinned, valid_until, created_at').eq('site_id', siteId),
        sb.from('complaints').select('category, title, description, status, priority, created_at, resolved_at').eq('site_id', siteId),
        sb.from('charge_types').select('ad, borc_hedefi, gecikme_uygula, is_active').eq('site_id', siteId),
      ]);

      const u = (r: { units?: { block?: string | null; apartment_number?: string | null } | null }) =>
        [r.units?.block, r.units?.apartment_number].filter(Boolean).join('/') || '—';

      const sheets = [
        { name: 'Daireler', rows: (units.data ?? []).map((r) => ({ 'Blok': r.block ?? '', 'Daire No': r.apartment_number, 'Kat': r.floor ?? '', 'Arsa Payı': r.arsa_payi ?? '' })) },
        { name: 'Sakinler', rows: (tenancies.data ?? []).map((r) => ({ 'Daire': u(r as never), 'Tip': r.relationship === 'malik' ? 'Malik' : 'Kiracı', 'Ad Soyad': r.full_name, 'TC Kimlik': r.tc_kimlik ?? '', 'Telefon': r.phone ?? '', 'Başlangıç': fmtDate(r.start_date), 'Bitiş': r.end_date ? fmtDate(r.end_date) : 'Güncel' })) },
        { name: 'Bakiyeler', rows: (balances.data ?? []).map((r) => ({ 'Blok': r.block ?? '', 'Daire No': r.apartment_number, 'Kalan Anapara': r.kalan_anapara ?? 0, 'Kalan Gecikme': r.kalan_gecikme ?? 0, 'Toplam Borç': r.toplam_borc ?? 0 })) },
        { name: 'Tahakkuklar', rows: (accruals.data ?? []).map((r) => ({ 'Daire': u(r as never), 'Dönem': `${r.period_month}/${r.period_year}`, 'Tutar': r.amount ?? 0, 'Kalan': r.principal_remaining ?? 0, 'Durum': r.status, 'Vade': fmtDate(r.due_date), 'Açıklama': r.description ?? '' })) },
        { name: 'Tahsilatlar', rows: (collections.data ?? []).map((r) => ({ 'Daire': u(r as never), 'Tutar': r.amount ?? 0, 'Yöntem': r.method ?? '', 'Tarih': fmtDateTime(r.paid_at) })) },
        { name: 'Giderler', rows: (expenses.data ?? []).map((r) => ({ 'Tutar': r.amount ?? 0, 'Kategori': r.category ?? '', 'Açıklama': r.description ?? '', 'Tarih': fmtDate(r.spent_at) })) },
        { name: 'Banka Hareketleri', rows: (bank.data ?? []).map((r) => ({ 'Tarih': fmtDate(r.txn_date), 'Yön': r.direction === 'in' ? 'Giriş' : 'Çıkış', 'Tutar': r.amount ?? 0, 'Açıklama': r.description ?? '', 'Karşı Taraf': r.counterparty ?? '', 'Eşleşme': r.match_status ?? '' })) },
        { name: 'Duyurular', rows: (announcements.data ?? []).map((r) => ({ 'Başlık': r.title, 'İçerik': r.content ?? '', 'Öncelik': r.priority ?? '', 'Sabit': r.is_pinned ? 'Evet' : 'Hayır', 'Geçerlilik': fmtDate(r.valid_until), 'Oluşturulma': fmtDateTime(r.created_at) })) },
        { name: 'Şikayetler', rows: (complaints.data ?? []).map((r) => ({ 'Kategori': r.category ?? '', 'Başlık': r.title, 'Açıklama': r.description ?? '', 'Durum': r.status ?? '', 'Öncelik': r.priority ?? '', 'Oluşturulma': fmtDateTime(r.created_at), 'Çözüm': r.resolved_at ? fmtDateTime(r.resolved_at) : '' })) },
        { name: 'Tahakkuk Türleri', rows: (chargeTypes.data ?? []).map((r) => ({ 'Ad': r.ad, 'Borç Hedefi': r.borc_hedefi === 'malik' ? 'Malik' : 'Kiracı', 'Gecikme Uygula': r.gecikme_uygula ? 'Evet' : 'Hayır', 'Aktif': r.is_active ? 'Evet' : 'Hayır' })) },
      ];

      const stamp = todayLocalISO();
      downloadBlob(buildExportBlob(sheets), `komsu-asistani-veri-${stamp}.xlsx`);
    } catch (err) {
      setError('Dışa aktarma başarısız: ' + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={run} disabled={busy}
        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
        {busy ? 'Hazırlanıyor…' : '📤 Tüm verileri Excel olarak indir'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
