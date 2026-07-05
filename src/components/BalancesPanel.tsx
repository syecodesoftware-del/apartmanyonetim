'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { Segmented } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { money } from '@/lib/format';
import { parseTrAmount, sanitizeAmountInput } from '@/lib/amount';
import { todayLocalISO } from '@/lib/date';
import { friendlyDbMessage } from '@/lib/error';

export type BalanceRow = {
  unit_id: string | null;
  block: string | null;
  apartment_number: string | null;
  kalan_anapara: number | null;
  kalan_gecikme: number | null;
  toplam_borc: number | null;
  // P4: avans = mahsup edilmemiş fazla ödeme; net_borc = toplam_borc - avans (yeni tahakkukta otomatik mahsup edilir)
  avans: number | null;
  net_borc: number | null;
};

export function BalancesPanel({ balances, siteId }: { balances: BalanceRow[]; siteId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [asOf, setAsOf] = useState(todayLocalISO());
  const [runningLate, setRunningLate] = useState(false);

  // Tahsilat modalı
  const [target, setTarget] = useState<BalanceRow | null>(null);
  const [amount, setAmount] = useState('');
  // 'bank' — collections_method_check yalnız cash/bank/online/qr kabul eder ('transfer' DB'de reddedilir)
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  function openCollect(b: BalanceRow) {
    setTarget(b); setAmount(b.toplam_borc ? String(Math.round((b.toplam_borc) * 100) / 100) : ''); setMethod('cash'); setError(''); setInfo(null);
  }

  async function collect(e: React.FormEvent) {
    e.preventDefault();
    if (!target?.unit_id) return;
    const amt = parseTrAmount(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Geçerli bir tutar giriniz (örn. 750 veya 1.234,50).'); return; }
    setBusy(true); setError('');
    const { data, error } = await supabaseBrowser().rpc('record_collection', {
      p_site_id: siteId, p_unit_id: target.unit_id, p_amount: amt, p_method: method,
    });
    setBusy(false);
    if (error) { setError(friendlyDbMessage(error.message)); return; }
    const leftover = Number(data ?? 0);
    setTarget(null);
    setInfo(leftover > 0 ? `Tahsilat alındı. ${money(leftover, true)} avans/artan olarak kaydedildi.` : 'Tahsilat alındı.');
    router.refresh();
  }

  async function runLateFees() {
    if (!confirm(`${asOf} tarihine kadar gecikme tazminatı hesaplansın mı?`)) return;
    setRunningLate(true); setInfo(null);
    const { data, error } = await supabaseBrowser().rpc('calculate_late_fees', { p_site_id: siteId, p_as_of_date: asOf });
    setRunningLate(false);
    if (error) { alert('Hesaplanamadı: ' + friendlyDbMessage(error.message)); return; }
    setInfo(`${data ?? 0} daireye gecikme tazminatı işlendi.`);
    router.refresh();
  }

  return (
    <>
      {info && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {info}</p>}
      <Card
        title="Daire Bakiyeleri"
        action={
          ro ? undefined : (
            <div className="flex items-center gap-2">
              <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500" />
              <button onClick={runLateFees} disabled={runningLate} className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60">
                {runningLate ? '…' : 'Gecikme Hesapla'}
              </button>
            </div>
          )
        }
      >
        {balances.length === 0 ? (
          <EmptyState>Henüz daire/bakiye yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr><Th>Daire</Th><Th className="text-right">Anapara</Th><Th className="text-right">Gecikme</Th><Th className="text-right">Avans</Th><Th className="text-right">Toplam Borç</Th><Th className="text-right">Net Borç</Th><Th className="text-right">İşlem</Th></tr>
            </thead>
            <tbody>
              {balances.map((b) => {
                const debt = b.toplam_borc ?? 0;
                const advance = b.avans ?? 0;
                const net = b.net_borc ?? debt - advance;
                return (
                  <tr key={b.unit_id} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-800">{[b.block, b.apartment_number].filter(Boolean).join(' / ') || '—'}</Td>
                    <Td className="text-right">{money(b.kalan_anapara, true)}</Td>
                    <Td className="text-right text-amber-700">{money(b.kalan_gecikme, true)}</Td>
                    <Td className={`text-right ${advance > 0.005 ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}>{advance > 0.005 ? money(advance, true) : '—'}</Td>
                    <Td className={`text-right font-semibold ${debt > 0.005 ? 'text-red-600' : 'text-emerald-600'}`}>{money(debt, true)}</Td>
                    <Td className={`text-right font-semibold ${net > 0.005 ? 'text-red-600' : 'text-emerald-600'}`}>{money(net, true)}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        {!ro && <button onClick={() => openCollect(b)} className="text-xs font-semibold text-blue-600 hover:underline">Tahsilat Al</button>}
                        {b.unit_id && <Link href={`/balances/${b.unit_id}`} className="text-xs font-semibold text-slate-500 hover:underline">Ekstre</Link>}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {target && (
        <Modal title="Tahsilat Al" onClose={() => setTarget(null)}>
          <p className="mb-3 text-sm text-slate-500">
            {[target.block, target.apartment_number].filter(Boolean).join(' / ') || 'Daire'} · Açık borç: <span className="font-semibold text-slate-700">{money(target.toplam_borc, true)}</span>
            {(target.avans ?? 0) > 0.005 && <> · Avans: <span className="font-semibold text-emerald-600">{money(target.avans, true)}</span> (yeni tahakkukta otomatik mahsup edilir)</>}
          </p>
          <form onSubmit={collect} className="space-y-3">
            <Field label="Tutar (₺)"><input value={amount} onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" autoFocus placeholder="örn. 750 veya 1.234,50" className={inputCls} /></Field>
            <Field label="Yöntem"><Segmented value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Nakit' }, { value: 'bank', label: 'Havale/EFT' }]} /></Field>
            <p className="text-xs text-slate-400">Tahsilat en eski borçtan başlanarak mahsup edilir; artan tutar avans olarak kaydedilir.</p>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{busy ? 'Kaydediliyor…' : 'Tahsilatı Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
