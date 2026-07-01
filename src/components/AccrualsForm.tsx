'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card } from '@/components/ui';
import { inputCls, Modal, Field } from '@/components/UnitsPanel';
import { Segmented, Toggle } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';

export type ChargeOption = { id: string; ad: string; is_active: boolean };
type Distribution = 'arsa_payi' | 'esit';
const DIST: { value: Distribution; label: string }[] = [
  { value: 'arsa_payi', label: 'Arsa payı' },
  { value: 'esit', label: 'Eşit' },
];
const now = new Date();

export function AccrualsForm({ chargeTypes, siteId }: { chargeTypes: ChargeOption[]; siteId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [chargeTypeId, setChargeTypeId] = useState<string | null>(chargeTypes[0]?.id ?? null);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [distribution, setDistribution] = useState<Distribution>('arsa_payi');
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Yeni gider türü modalı
  const [ctOpen, setCtOpen] = useState(false);
  const [ctName, setCtName] = useState('');
  const [ctTarget, setCtTarget] = useState<'malik' | 'kiraci'>('kiraci');
  const [ctLate, setCtLate] = useState(true);
  const [ctIcra, setCtIcra] = useState(false);
  const [ctSaving, setCtSaving] = useState(false);

  async function createCt(e: React.FormEvent) {
    e.preventDefault();
    if (!ctName.trim()) return;
    setCtSaving(true);
    const { data, error } = await supabaseBrowser().from('charge_types')
      .insert({ site_id: siteId, ad: ctName.trim(), borc_hedefi: ctTarget, gecikme_uygula: ctLate, is_icra: ctIcra })
      .select('id').single();
    setCtSaving(false);
    if (error || !data) { alert('Tür eklenemedi: ' + (error?.message ?? '')); return; }
    setCtOpen(false); setCtName(''); setCtTarget('kiraci'); setCtLate(true); setCtIcra(false);
    setChargeTypeId(data.id);
    router.refresh();
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    if (!chargeTypeId) { setError('Gider türü seçiniz.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) { setError('Vade tarihini seçiniz.'); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Geçerli bir tutar giriniz.'); return; }
    setBusy(true);
    const { data, error } = await supabaseBrowser().rpc('generate_accruals', {
      p_site_id: siteId, p_charge_type_id: chargeTypeId,
      p_period_month: Number(month), p_period_year: Number(year),
      p_due_date: dueDate, p_amount: amt, p_distribution: distribution,
    });
    setBusy(false);
    if (error) { setError(error.message.replace(/^.*?:\s*/, '')); return; }
    setResult(`${data ?? 0} daireye borç tahakkuk ettirildi.`);
  }

  if (ro) {
    return (
      <div className="max-w-xl">
        <Card>
          <p className="text-sm text-slate-500">Denetçi modunda borç tahakkuku oluşturulamaz. Tahakkuk eden borçları “Bakiyeler” ve daire ekstrelerinden görüntüleyebilirsiniz.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Card>
        <form onSubmit={generate} className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Gider Türü</p>
            <div className="flex flex-wrap gap-2">
              {chargeTypes.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setChargeTypeId(ct.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    chargeTypeId === ct.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {ct.ad}
                </button>
              ))}
              <button type="button" onClick={() => setCtOpen(true)} className="rounded-full border border-dashed border-blue-400 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">+ Yeni Tür</button>
            </div>
            {chargeTypes.length === 0 && <p className="mt-1 text-xs text-amber-600">Önce bir gider türü ekleyin (ör. “Aidat”).</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ay"><input value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={2} className={inputCls} /></Field>
            <Field label="Yıl"><input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={4} className={inputCls} /></Field>
          </div>

          <Field label="Son Ödeme Tarihi (vade)"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Toplam Tutar (₺)"><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Sabit modda: daire başı tutar" className={inputCls} /></Field>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Dağıtım Anahtarı</p>
            <Segmented value={distribution} onChange={setDistribution} options={DIST} />
            <p className="mt-1.5 text-xs text-slate-400">
              Arsa payı: tutar arsa payına göre bölünür · Eşit: tüm dairelere eşit bölünür.
              {distribution === 'arsa_payi' && ' Tüm dairelerde arsa payı dolu olmalı (Daireler ekranı).'}
            </p>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {result}</p>}

          <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Oluşturuluyor…' : 'Tahakkuk Oluştur'}
          </button>
        </form>
      </Card>

      {ctOpen && (
        <Modal title="Yeni Gider Türü" onClose={() => setCtOpen(false)}>
          <form onSubmit={createCt} className="space-y-3">
            <Field label="Ad (ör. Aidat, Yakıt)"><input value={ctName} onChange={(e) => setCtName(e.target.value)} autoFocus className={inputCls} /></Field>
            <Field label="Borç hedefi"><Segmented value={ctTarget} onChange={setCtTarget} options={[{ value: 'kiraci', label: 'Kiracı' }, { value: 'malik', label: 'Malik' }]} /></Field>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"><span className="text-sm text-slate-700">Gecikme tazminatı uygula</span><Toggle checked={ctLate} onChange={setCtLate} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setCtOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={ctSaving || !ctName.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{ctSaving ? '…' : 'Ekle'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
