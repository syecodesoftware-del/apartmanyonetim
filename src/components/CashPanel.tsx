'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { Segmented } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { parseTrAmount, sanitizeAmountInput } from '@/lib/amount';
import { todayLocalISO } from '@/lib/date';

export type AccountBalance = {
  cash_account_id: string | null;
  ad: string | null;
  tur: string | null;
  is_active: boolean | null;
  balance: number | null;
};
export type Movement = {
  id: string | null;
  cash_account_id: string | null;
  yon: string | null;
  amount: number | null;
  hareket_tarihi: string | null;
  tur: string | null;
  detay: string | null;
  kaynak: string | null; // 'tahsilat' | 'gider' | 'virman'
};

const CATEGORIES = ['Temizlik', 'Tamir', 'Elektrik', 'Su', 'Asansör', 'Bahçe', 'Personel', 'Diğer'];


export function CashPanel({ balances, movements, siteId, managerId }: { balances: AccountBalance[]; movements: Movement[]; siteId: string; managerId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const accountName = (id: string | null) => balances.find((b) => b.cash_account_id === id)?.ad ?? '—';

  // Hesap modalı
  const [accOpen, setAccOpen] = useState(false);
  const [accAd, setAccAd] = useState('');
  const [accTur, setAccTur] = useState<'nakit' | 'banka'>('nakit');
  const [accIban, setAccIban] = useState('');
  const [accOpening, setAccOpening] = useState('');

  // Gider modalı
  const [expOpen, setExpOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expAccount, setExpAccount] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(todayLocalISO());

  // Virman modalı
  const [trOpen, setTrOpen] = useState(false);
  const [trFrom, setTrFrom] = useState('');
  const [trTo, setTrTo] = useState('');
  const [trAmount, setTrAmount] = useState('');
  const [trDate, setTrDate] = useState(todayLocalISO());
  const [trNote, setTrNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rapor #27: "Mart'taki elektrik faturası neydi" — kaydır-bul yerine filtre
  const [fQ, setFQ] = useState('');
  const [fAccount, setFAccount] = useState('');
  const [fKaynak, setFKaynak] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const hasFilter = !!(fQ.trim() || fAccount || fKaynak || fFrom || fTo);

  const fTerm = fQ.trim().toLocaleLowerCase('tr');
  const visibleMovements = movements.filter((m) => {
    if (fAccount && m.cash_account_id !== fAccount) return false;
    if (fKaynak && m.kaynak !== fKaynak) return false;
    const d = m.hareket_tarihi?.slice(0, 10) ?? '';
    if (fFrom && d < fFrom) return false;
    if (fTo && d > fTo) return false;
    if (fTerm && ![m.tur, m.detay].filter(Boolean).some((v) => String(v).toLocaleLowerCase('tr').includes(fTerm))) return false;
    return true;
  });
  const filteredTotal = visibleMovements.reduce((s, m) => s + (m.yon === 'giris' ? 1 : -1) * Number(m.amount ?? 0), 0);

  function openNewAccount() { setAccAd(''); setAccTur('nakit'); setAccIban(''); setAccOpening(''); setError(null); setAccOpen(true); }

  function openTransfer() {
    setTrFrom(balances[0]?.cash_account_id ?? '');
    setTrTo(balances[1]?.cash_account_id ?? '');
    setTrAmount(''); setTrDate(todayLocalISO()); setTrNote(''); setError(null);
    setTrOpen(true);
  }

  async function saveTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseTrAmount(trAmount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Geçerli bir tutar giriniz (örn. 750 veya 1.234,50).'); return; }
    if (!trFrom || !trTo) { setError('Kaynak ve hedef hesap seçiniz.'); return; }
    if (trFrom === trTo) { setError('Kaynak ve hedef hesap aynı olamaz.'); return; }
    setBusy(true);
    const { error } = await supabaseBrowser().from('cash_transfers').insert({
      site_id: siteId, from_account_id: trFrom, to_account_id: trTo,
      amount: amt, transfer_date: trDate, note: trNote.trim() || null, created_by: managerId,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setTrOpen(false);
    router.refresh();
  }

  async function deleteTransfer(m: Movement) {
    if (!m.id) return;
    if (!confirm(`Virman (${money(m.amount, true)}) silinsin mi? Her iki hesabın bakiyesi eski haline döner.`)) return;
    const { error } = await supabaseBrowser().from('cash_transfers').delete().eq('id', m.id);
    if (error) { alert('Silinemedi: ' + error.message); return; }
    router.refresh();
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accAd.trim()) { setError('Hesap adı zorunludur.'); return; }
    const opening = accOpening.trim() ? parseTrAmount(accOpening) : 0;
    if (!Number.isFinite(opening)) { setError('Geçerli bir açılış bakiyesi giriniz (örn. 1.234,50).'); return; }
    setBusy(true);
    const { error } = await supabaseBrowser().from('cash_accounts').insert({
      site_id: siteId, ad: accAd.trim(), tur: accTur,
      iban: accTur === 'banka' ? (accIban.trim() || null) : null,
      opening_balance: opening,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setAccOpen(false);
    router.refresh();
  }

  function openNewExpense() {
    setEditingId(null); setExpAccount(balances[0]?.cash_account_id ?? ''); setExpAmount(''); setExpCategory(''); setExpDesc(''); setExpDate(todayLocalISO()); setError(null); setExpOpen(true);
  }

  async function openEditExpense(m: Movement) {
    if (!m.id) return;
    const { data } = await supabaseBrowser().from('cash_expenses').select('amount, category, description, cash_account_id, spent_at').eq('id', m.id).single();
    if (!data) { alert('Gider bulunamadı.'); return; }
    setEditingId(m.id);
    setExpAccount(data.cash_account_id ?? '');
    setExpAmount(String(data.amount ?? ''));
    setExpCategory(data.category ?? '');
    setExpDesc(data.description ?? '');
    setExpDate(data.spent_at ?? todayLocalISO());
    setError(null);
    setExpOpen(true);
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editingId && !expAccount) { setError('Kasa seçiniz.'); return; }
    const amt = parseTrAmount(expAmount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Geçerli bir tutar giriniz (örn. 750 veya 1.234,50).'); return; }
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = editingId
      ? await sb.from('cash_expenses').update({ amount: amt, category: expCategory.trim() || null, description: expDesc.trim() || null, spent_at: expDate }).eq('id', editingId)
      : await sb.from('cash_expenses').insert({
          site_id: siteId, cash_account_id: expAccount, amount: amt,
          category: expCategory.trim() || null, description: expDesc.trim() || null,
          spent_at: expDate, created_by: managerId,
        });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setExpOpen(false);
    router.refresh();
  }

  async function deleteExpense(m: Movement) {
    if (!m.id) return;
    if (!confirm(`${m.tur ?? 'Gider'} · ${money(m.amount, true)} silinsin mi? Bu işlem geri alınamaz.`)) return;
    const { error } = await supabaseBrowser().from('cash_expenses').delete().eq('id', m.id);
    if (error) { alert('Silinemedi: ' + error.message); return; }
    router.refresh();
  }

  return (
    <>
      {/* Hesap kartları */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((b) => {
          const isBank = b.tur === 'banka';
          return (
            <div key={b.cash_account_id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{b.ad}</span>
                <Badge tone={isBank ? 'blue' : 'slate'}>{isBank ? 'Banka' : 'Nakit'}</Badge>
              </div>
              <p className={`mt-2 text-2xl font-bold ${(b.balance ?? 0) < 0 ? 'text-red-600' : 'text-slate-900'}`}>{money(b.balance, true)}</p>
              {isBank && b.cash_account_id && (
                <Link href={`/cash/${b.cash_account_id}`} className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline">Mutabakat →</Link>
              )}
            </div>
          );
        })}
        {!ro && (
          <button onClick={openNewAccount} className="flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50/40">
            <span className="text-2xl">＋</span><span className="text-sm font-medium">Yeni Hesap</span>
          </button>
        )}
      </div>

      <Card
        title="Hareketler"
        action={
          ro ? undefined : (
            <div className="flex gap-2">
              <button onClick={openTransfer} disabled={balances.length < 2} title={balances.length < 2 ? 'Virman için en az iki hesap gerekir' : undefined} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">⇄ Virman</button>
              <button onClick={openNewExpense} disabled={balances.length === 0} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">+ Gider Gir</button>
            </div>
          )
        }
      >
        {movements.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={fQ}
              onChange={(e) => setFQ(e.target.value)}
              placeholder="Detayda ara (elektrik, fatura…)"
              className="w-full max-w-52 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            />
            {balances.length > 1 && (
              <select value={fAccount} onChange={(e) => setFAccount(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-500">
                <option value="">Tüm hesaplar</option>
                {balances.map((b) => <option key={b.cash_account_id} value={b.cash_account_id ?? ''}>{b.ad}</option>)}
              </select>
            )}
            <select value={fKaynak} onChange={(e) => setFKaynak(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-500">
              <option value="">Tüm türler</option>
              <option value="tahsilat">Tahsilat</option>
              <option value="gider">Gider</option>
              <option value="virman">Virman</option>
            </select>
            <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-blue-500" title="Başlangıç" />
            <span className="text-xs text-slate-400">—</span>
            <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-blue-500" title="Bitiş" />
            {hasFilter && (
              <>
                <button onClick={() => { setFQ(''); setFAccount(''); setFKaynak(''); setFFrom(''); setFTo(''); }} className="text-xs font-semibold text-slate-500 hover:underline">✕ Temizle</button>
                <span className="ml-auto text-xs text-slate-500">
                  {visibleMovements.length} hareket · net <span className={`font-semibold tabular-nums ${filteredTotal < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{money(filteredTotal, true)}</span>
                </span>
              </>
            )}
          </div>
        )}
        {movements.length === 0 ? (
          <EmptyState>Henüz hareket yok.</EmptyState>
        ) : visibleMovements.length === 0 ? (
          <EmptyState>Filtreyle eşleşen hareket yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr><Th>Tür / Detay</Th><Th>Hesap</Th><Th>Tarih</Th><Th className="text-right">Tutar</Th><Th className="text-right">İşlem</Th></tr>
            </thead>
            <tbody>
              {visibleMovements.map((m, i) => {
                const giris = m.yon === 'giris';
                return (
                  <tr key={`${m.id}-${i}`} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-800">{m.tur}{m.detay ? <span className="font-normal text-slate-400"> · {m.detay}</span> : ''}</Td>
                    <Td>{accountName(m.cash_account_id)}</Td>
                    <Td>{date(m.hareket_tarihi)}</Td>
                    <Td className={`text-right font-semibold ${giris ? 'text-emerald-600' : 'text-red-600'}`}>{giris ? '+ ' : '− '}{money(m.amount, true)}</Td>
                    <Td className="text-right">
                      {ro ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : m.kaynak === 'gider' ? (
                        <div className="flex justify-end gap-3">
                          <button onClick={() => openEditExpense(m)} className="text-xs font-semibold text-blue-600 hover:underline">Düzenle</button>
                          <button onClick={() => deleteExpense(m)} className="text-xs font-semibold text-red-600 hover:underline">Sil</button>
                        </div>
                      ) : m.kaynak === 'virman' && !giris ? (
                        <button onClick={() => deleteTransfer(m)} className="text-xs font-semibold text-red-600 hover:underline">Sil</button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Yeni hesap modalı */}
      {accOpen && (
        <Modal title="Yeni Kasa / Banka Hesabı" onClose={() => setAccOpen(false)}>
          <form onSubmit={saveAccount} className="space-y-3">
            <Field label="Hesap Adı *"><input value={accAd} onChange={(e) => setAccAd(e.target.value)} autoFocus className={inputCls} /></Field>
            <Field label="Tür"><Segmented value={accTur} onChange={setAccTur} options={[{ value: 'nakit', label: 'Nakit' }, { value: 'banka', label: 'Banka' }]} /></Field>
            {accTur === 'banka' && <Field label="IBAN"><input value={accIban} onChange={(e) => setAccIban(e.target.value)} className={inputCls} /></Field>}
            <Field label="Açılış Bakiyesi (₺)"><input value={accOpening} onChange={(e) => setAccOpening(sanitizeAmountInput(e.target.value, true))} inputMode="decimal" className={inputCls} /></Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAccOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? '…' : 'Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Virman modalı */}
      {trOpen && (
        <Modal title="Virman — Hesaplar Arası Aktarım" onClose={() => setTrOpen(false)}>
          <p className="mb-3 text-xs text-slate-500">
            Virman gelir/gider sayılmaz; yalnız hesap bakiyelerini taşır. İşletme defterine yansımaz.
          </p>
          <form onSubmit={saveTransfer} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Kaynak Hesap">
                <select value={trFrom} onChange={(e) => setTrFrom(e.target.value)} className={inputCls}>
                  {balances.map((b) => <option key={b.cash_account_id} value={b.cash_account_id ?? ''}>{b.ad} ({money(b.balance, true)})</option>)}
                </select>
              </Field>
              <Field label="Hedef Hesap">
                <select value={trTo} onChange={(e) => setTrTo(e.target.value)} className={inputCls}>
                  {balances.filter((b) => b.cash_account_id !== trFrom).map((b) => <option key={b.cash_account_id} value={b.cash_account_id ?? ''}>{b.ad}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tutar (₺) *"><input value={trAmount} onChange={(e) => setTrAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" autoFocus placeholder="örn. 5.000" className={inputCls} /></Field>
              <Field label="Tarih"><input type="date" value={trDate} onChange={(e) => setTrDate(e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label="Açıklama"><input value={trNote} onChange={(e) => setTrNote(e.target.value)} placeholder="örn. Kasadaki nakit bankaya yatırıldı" className={inputCls} /></Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setTrOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? '…' : 'Virmanı Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Gider modalı */}
      {expOpen && (
        <Modal title={editingId ? 'Gideri Düzenle' : 'Kasadan Gider'} onClose={() => setExpOpen(false)}>
          <form onSubmit={saveExpense} className="space-y-3">
            <Field label="Kasa / Hesap">
              <select value={expAccount} onChange={(e) => setExpAccount(e.target.value)} disabled={!!editingId} className={`${inputCls} disabled:bg-slate-100`}>
                {balances.map((b) => <option key={b.cash_account_id} value={b.cash_account_id ?? ''}>{b.ad}</option>)}
              </select>
            </Field>
            <Field label="Tutar (₺) *"><input value={expAmount} onChange={(e) => setExpAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" autoFocus placeholder="örn. 750 veya 1.234,50" className={inputCls} /></Field>
            <Field label="Kategori">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button type="button" key={c} onClick={() => setExpCategory((cur) => (cur === c ? '' : c))} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${expCategory === c ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>{c}</button>
                ))}
              </div>
              <input value={expCategory} onChange={(e) => setExpCategory(e.target.value)} placeholder="Kategori" className={inputCls} />
            </Field>
            <Field label="Açıklama"><input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className={inputCls} /></Field>
            <Field label="Tarih"><input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className={inputCls} /></Field>
            {editingId && <p className="text-xs text-slate-400">Tarih değişikliği kilitli döneme taşınamaz (dönem kilidi otomatik engeller).</p>}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setExpOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
