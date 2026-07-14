'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { Segmented } from '@/components/controls';
import { money } from '@/lib/format';
import { parseTrAmount, sanitizeAmountInput } from '@/lib/amount';
import { todayLocalISO } from '@/lib/date';
import { friendlyDbMessage } from '@/lib/error';

export type AccountOption = { id: string; ad: string; tur: string };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Tahsilat modalı — tutar + yöntem + tarih + hesap tek yerde; kayıttan sonra makbuz yazdırma.
 *  Tarih bugünse RPC'ye gönderilmez (now() saatiyle kaydedilir); geçmiş tarihte öğlen 12:00 yazılır. */
export function CollectModal({ siteId, unitId, unitLabel, siteName = '', totalDebt, avans = 0, accounts, onClose, onDone }: {
  siteId: string;
  unitId: string;
  unitLabel: string;
  siteName?: string;
  totalDebt: number;
  avans?: number;
  accounts: AccountOption[];
  onClose: () => void;
  onDone: (info: string) => void;
}) {
  const [amount, setAmount] = useState(totalDebt > 0.005 ? String(Math.round(totalDebt * 100) / 100) : '');
  // 'bank' — collections_method_check yalnız cash/bank/online/qr kabul eder
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [paidDate, setPaidDate] = useState(todayLocalISO());
  const matching = useMemo(
    () => accounts.filter((a) => (method === 'cash' ? a.tur === 'nakit' : a.tur === 'banka')),
    [accounts, method],
  );
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Kayıt sonrası makbuz adımı
  const [done, setDone] = useState<null | { amount: number; method: 'cash' | 'bank'; paidDate: string; msg: string }>(null);

  // Yöntem değişince hesap seçimini o türün ilk hesabına çek
  function changeMethod(m: 'cash' | 'bank') {
    setMethod(m);
    setAccountId('');
  }
  const effectiveAccount = accountId || matching[0]?.id || '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseTrAmount(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Geçerli bir tutar giriniz (örn. 750 veya 1.234,50).'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) { setError('Geçerli bir tarih seçiniz.'); return; }
    if (paidDate > todayLocalISO()) { setError('Tahsilat tarihi ileri bir gün olamaz.'); return; }
    setBusy(true); setError('');
    const isToday = paidDate === todayLocalISO();
    const { data, error } = await supabaseBrowser().rpc('record_collection', {
      p_site_id: siteId, p_unit_id: unitId, p_amount: amt, p_method: method,
      p_paid_at: isToday ? undefined : `${paidDate}T12:00:00`,
      p_cash_account_id: effectiveAccount || undefined,
    });
    setBusy(false);
    if (error) { setError(friendlyDbMessage(error.message)); return; }
    const leftover = Number(data ?? 0);
    setDone({
      amount: amt, method, paidDate,
      msg: leftover > 0 ? `Tahsilat alındı. ${money(leftover, true)} avans/artan olarak kaydedildi.` : 'Tahsilat alındı.',
    });
  }

  function printReceipt() {
    if (!done) return;
    const accName = accounts.find((a) => a.id === effectiveAccount)?.ad ?? '';
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Tahsilat Makbuzu</title>
<style>
body{font-family:Georgia,serif;color:#111;margin:36px;font-size:14px;max-width:520px}
h1{font-size:17px;text-align:center;letter-spacing:2px;margin:0 0 2px}
h2{font-size:13px;text-align:center;font-weight:normal;margin:0 0 20px;color:#444}
table{width:100%;border-collapse:collapse;margin-top:8px}
td{border:1px solid #999;padding:8px 10px}
td.l{width:38%;background:#f5f5f5;font-size:12px}
.amount{font-size:18px;font-weight:bold}
.sign{margin-top:44px;display:flex;justify-content:space-between}
.sign div{text-align:center;width:200px;border-top:1px solid #333;padding-top:6px;font-size:12px}
.foot{margin-top:26px;text-align:center;font-size:11px;color:#777}
@media print{body{margin:12mm}}
</style></head><body>
<h1>TAHSİLAT MAKBUZU</h1>
<h2>${esc(siteName)}</h2>
<table>
<tr><td class="l">Daire</td><td>${esc(unitLabel)}</td></tr>
<tr><td class="l">Tutar</td><td class="amount">${money(done.amount, true)}</td></tr>
<tr><td class="l">Ödeme Yöntemi</td><td>${done.method === 'cash' ? 'Nakit' : 'Havale / EFT'}${accName ? ` — ${esc(accName)}` : ''}</td></tr>
<tr><td class="l">Tarih</td><td>${done.paidDate.split('-').reverse().join('.')}</td></tr>
</table>
<div class="sign"><div>Teslim Eden</div><div>Teslim Alan (Yönetim)</div></div>
<p class="foot">Bu makbuz ${new Date().toLocaleString('tr-TR')} tarihinde Komşu Asistanı üzerinden düzenlenmiştir.</p>
</body></html>`;
    const w = window.open('', '_blank', 'width=700,height=800');
    if (!w) { alert('Yazdırma penceresi açılamadı (pop-up engelleyiciyi kapatın).'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  if (done) {
    return (
      <Modal title="Tahsilat Alındı ✓" onClose={() => onDone(done.msg)}>
        <p className="mb-1 text-sm text-emerald-700">✓ {done.msg}</p>
        <p className="mb-4 text-sm text-slate-500">
          {unitLabel} · {money(done.amount, true)} · {done.method === 'cash' ? 'Nakit' : 'Havale/EFT'} · {done.paidDate.split('-').reverse().join('.')}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => onDone(done.msg)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Kapat</button>
          <button onClick={printReceipt} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">🖨 Makbuz Yazdır</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Tahsilat Al — ${unitLabel}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        Açık borç: <span className="font-semibold text-slate-700">{money(totalDebt, true)}</span>
        {avans > 0.005 && <> · Avans: <span className="font-semibold text-emerald-600">{money(avans, true)}</span> (yeni tahakkukta otomatik mahsup edilir)</>}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Tutar (₺)">
          <input value={amount} onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" autoFocus placeholder="örn. 750 veya 1.234,50" className={inputCls} />
        </Field>
        <Field label="Yöntem">
          <Segmented value={method} onChange={changeMethod} options={[{ value: 'cash', label: 'Nakit' }, { value: 'bank', label: 'Havale/EFT' }]} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tarih">
            <input type="date" value={paidDate} max={todayLocalISO()} onChange={(e) => setPaidDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label={method === 'cash' ? 'Kasa' : 'Banka Hesabı'}>
            {matching.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Aktif {method === 'cash' ? 'nakit kasa' : 'banka hesabı'} yok — Kasa &amp; Banka ekranından ekleyin.
              </p>
            ) : (
              <select value={effectiveAccount} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                {matching.map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
              </select>
            )}
          </Field>
        </div>
        <p className="text-xs text-slate-400">Tahsilat en eski borçtan başlanarak mahsup edilir; artan tutar avans olarak kaydedilir.</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
          <button type="submit" disabled={busy || matching.length === 0} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{busy ? 'Kaydediliyor…' : 'Tahsilatı Kaydet'}</button>
        </div>
      </form>
    </Modal>
  );
}
