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
};

const CATEGORIES = ['Temizlik', 'Tamir', 'Elektrik', 'Su', 'Asansör', 'Bahçe', 'Personel', 'Diğer'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  const [expDate, setExpDate] = useState(todayISO());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNewAccount() { setAccAd(''); setAccTur('nakit'); setAccIban(''); setAccOpening(''); setError(null); setAccOpen(true); }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accAd.trim()) { setError('Hesap adı zorunludur.'); return; }
    const opening = accOpening.trim() ? Number(accOpening) : 0;
    if (isNaN(opening)) { setError('Geçerli bir açılış bakiyesi giriniz.'); return; }
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
    setEditingId(null); setExpAccount(balances[0]?.cash_account_id ?? ''); setExpAmount(''); setExpCategory(''); setExpDesc(''); setExpDate(todayISO()); setError(null); setExpOpen(true);
  }

  async function openEditExpense(m: Movement) {
    if (!m.id) return;
    const { data } = await supabaseBrowser().from('cash_expenses').select('amount, category, description, cash_account_id').eq('id', m.id).single();
    if (!data) { alert('Gider bulunamadı.'); return; }
    setEditingId(m.id);
    setExpAccount(data.cash_account_id ?? '');
    setExpAmount(String(data.amount ?? ''));
    setExpCategory(data.category ?? '');
    setExpDesc(data.description ?? '');
    setError(null);
    setExpOpen(true);
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editingId && !expAccount) { setError('Kasa seçiniz.'); return; }
    const amt = Number(expAmount);
    if (!amt || amt <= 0) { setError('Geçerli bir tutar giriniz.'); return; }
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = editingId
      ? await sb.from('cash_expenses').update({ amount: amt, category: expCategory.trim() || null, description: expDesc.trim() || null }).eq('id', editingId)
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
          ro ? undefined : <button onClick={openNewExpense} disabled={balances.length === 0} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">+ Gider Gir</button>
        }
      >
        {movements.length === 0 ? (
          <EmptyState>Henüz hareket yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr><Th>Tür / Detay</Th><Th>Hesap</Th><Th>Tarih</Th><Th className="text-right">Tutar</Th><Th className="text-right">İşlem</Th></tr>
            </thead>
            <tbody>
              {movements.map((m, i) => {
                const giris = m.yon === 'giris';
                return (
                  <tr key={`${m.id}-${i}`} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-800">{m.tur}{m.detay ? <span className="font-normal text-slate-400"> · {m.detay}</span> : ''}</Td>
                    <Td>{accountName(m.cash_account_id)}</Td>
                    <Td>{date(m.hareket_tarihi)}</Td>
                    <Td className={`text-right font-semibold ${giris ? 'text-emerald-600' : 'text-red-600'}`}>{giris ? '+ ' : '− '}{money(m.amount, true)}</Td>
                    <Td className="text-right">
                      {!giris && !ro ? (
                        <div className="flex justify-end gap-3">
                          <button onClick={() => openEditExpense(m)} className="text-xs font-semibold text-blue-600 hover:underline">Düzenle</button>
                          <button onClick={() => deleteExpense(m)} className="text-xs font-semibold text-red-600 hover:underline">Sil</button>
                        </div>
                      ) : <span className="text-xs text-slate-300">—</span>}
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
            <Field label="Açılış Bakiyesi (₺)"><input value={accOpening} onChange={(e) => setAccOpening(e.target.value.replace(/[^0-9.-]/g, ''))} inputMode="decimal" className={inputCls} /></Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAccOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? '…' : 'Kaydet'}</button>
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
            <Field label="Tutar (₺) *"><input value={expAmount} onChange={(e) => setExpAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" autoFocus className={inputCls} /></Field>
            <Field label="Kategori">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button type="button" key={c} onClick={() => setExpCategory((cur) => (cur === c ? '' : c))} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${expCategory === c ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>{c}</button>
                ))}
              </div>
              <input value={expCategory} onChange={(e) => setExpCategory(e.target.value)} placeholder="Kategori" className={inputCls} />
            </Field>
            <Field label="Açıklama"><input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className={inputCls} /></Field>
            {!editingId && <Field label="Tarih"><input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className={inputCls} /></Field>}
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
