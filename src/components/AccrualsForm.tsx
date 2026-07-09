'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card } from '@/components/ui';
import { inputCls, Modal, Field } from '@/components/UnitsPanel';
import { Segmented, Toggle } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { parseTrAmount, sanitizeAmountInput } from '@/lib/amount';
import { friendlyDbMessage } from '@/lib/error';

export type ChargeOption = { id: string; ad: string; is_active: boolean; borc_hedefi: string | null };
export type UnitOption = { id: string; block: string | null; apartment_number: string };
type Distribution = 'arsa_payi' | 'esit';
type DebtorType = 'kiraci' | 'malik';
type Mode = 'toplu' | 'tekil';
const DIST: { value: Distribution; label: string }[] = [
  { value: 'arsa_payi', label: 'Arsa payı' },
  { value: 'esit', label: 'Eşit' },
];
const DEBTOR: { value: DebtorType; label: string }[] = [
  { value: 'kiraci', label: 'Kiracı' },
  { value: 'malik', label: 'Mülk Sahibi' },
];
const MODES: { value: Mode; label: string }[] = [
  { value: 'toplu', label: 'Toplu Tahakkuk' },
  { value: 'tekil', label: 'Tek Daireye Borç' },
];

function unitLabel(u: UnitOption) {
  return `${u.block ? u.block + ' ' : ''}Daire ${u.apartment_number}`;
}

export function AccrualsForm({ chargeTypes, units, siteId }: { chargeTypes: ChargeOption[]; units: UnitOption[]; siteId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [mode, setMode] = useState<Mode>('toplu');
  const [chargeTypeId, setChargeTypeId] = useState<string | null>(chargeTypes[0]?.id ?? null);
  // Daire-merkezli mimari: borçlu tipi her borçta seçilir; türün varsayılanı ön-seçim olur
  const [debtorType, setDebtorType] = useState<DebtorType>(
    chargeTypes[0]?.borc_hedefi === 'malik' ? 'malik' : 'kiraci'
  );
  // O6: modül-seviyesi new Date() ilk import anında donuyordu; ay/yıl her açılışta hesaplanır
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [distribution, setDistribution] = useState<Distribution>('arsa_payi');
  const [unitId, setUnitId] = useState<string>(units[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Yeni tahakkuk türü modalı
  const [ctOpen, setCtOpen] = useState(false);
  const [ctName, setCtName] = useState('');
  const [ctTarget, setCtTarget] = useState<'malik' | 'kiraci'>('kiraci');
  const [ctLate, setCtLate] = useState(true);
  const [ctIcra, setCtIcra] = useState(false);
  const [ctSaving, setCtSaving] = useState(false);

  function selectChargeType(ct: ChargeOption) {
    setChargeTypeId(ct.id);
    setDebtorType(ct.borc_hedefi === 'malik' ? 'malik' : 'kiraci');
  }

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
    setDebtorType(ctTarget);
    router.refresh();
  }

  function validateCommon(): number | null {
    if (!chargeTypeId) { setError('Gider türü seçiniz.'); return null; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) { setError('Vade tarihini seçiniz.'); return null; }
    const amt = parseTrAmount(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Geçerli bir tutar giriniz (örn. 750 veya 1.234,50).'); return null; }
    return amt;
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    const amt = validateCommon();
    if (amt == null) return;
    const m = Number(month), y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12) { setError('Ay 1-12 arasında olmalı.'); return; }
    if (!Number.isInteger(y) || y < 2020 || y > 2100) { setError('Geçerli bir yıl giriniz.'); return; }
    setBusy(true);
    const { data, error } = await supabaseBrowser().rpc('generate_accruals', {
      p_site_id: siteId, p_charge_type_id: chargeTypeId!,
      p_period_month: m, p_period_year: y,
      p_due_date: dueDate, p_amount: amt, p_distribution: distribution,
      p_debtor_type: debtorType,
    });
    setBusy(false);
    if (error) { setError(friendlyDbMessage(error.message)); return; }
    setResult(`${data ?? 0} daireye borç tahakkuk ettirildi (borçlu: ${debtorType === 'kiraci' ? 'kiracı' : 'mülk sahibi'}).`);
  }

  async function createSingle(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    if (!unitId) { setError('Daire seçiniz.'); return; }
    const amt = validateCommon();
    if (amt == null) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('create_unit_accrual', {
      p_unit_id: unitId, p_charge_type_id: chargeTypeId!,
      p_amount: amt, p_due_date: dueDate, p_debtor_type: debtorType,
      p_description: description.trim() || undefined,
    });
    setBusy(false);
    if (error) { setError(friendlyDbMessage(error.message)); return; }
    const u = units.find((x) => x.id === unitId);
    setResult(`${u ? unitLabel(u) : 'Daire'} için ${debtorType === 'kiraci' ? 'kiracıya' : 'mülk sahibine'} borç oluşturuldu.`);
    setAmount(''); setDescription('');
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
    <div className="max-w-xl space-y-4">
      <Segmented value={mode} onChange={setMode} options={MODES} />
      <Card>
        <form onSubmit={mode === 'toplu' ? generate : createSingle} className="space-y-4">
          {mode === 'tekil' && (
            <Field label="Daire">
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputCls}>
                {units.map((u) => <option key={u.id} value={u.id}>{unitLabel(u)}</option>)}
              </select>
            </Field>
          )}

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Tahakkuk Türü</p>
            <div className="flex flex-wrap gap-2">
              {chargeTypes.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => selectChargeType(ct)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    chargeTypeId === ct.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {ct.ad}
                </button>
              ))}
              <button type="button" onClick={() => setCtOpen(true)} className="rounded-full border border-dashed border-blue-400 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">+ Yeni Tür</button>
            </div>
            {chargeTypes.length === 0 && <p className="mt-1 text-xs text-amber-600">Önce bir tahakkuk türü ekleyin (ör. “Aidat”).</p>}
          </div>

          {mode === 'toplu' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ay"><input value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={2} className={inputCls} /></Field>
              <Field label="Yıl"><input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={4} className={inputCls} /></Field>
            </div>
          )}

          <Field label="Son Ödeme Tarihi (vade)"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></Field>
          <Field label={mode === 'toplu' ? 'Toplam Tutar (₺)' : 'Tutar (₺)'}><input value={amount} onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" placeholder="örn. 750 veya 1.234,50" className={inputCls} /></Field>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Borçlu Tipi</p>
            <Segmented value={debtorType} onChange={setDebtorType} options={DEBTOR} />
            <p className="mt-1.5 text-xs text-slate-400">
              Borç daireye kaydedilir; seçilen tipin o anki sorumlusu borçlu olur. Kişi değişse bile eski borçların sorumlusu değişmez.
              {mode === 'toplu' && debtorType === 'kiraci' && ' Kiracısı olmayan dairelerde borç mülk sahibine yazılır.'}
            </p>
          </div>

          {mode === 'toplu' && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Dağıtım Anahtarı</p>
              <Segmented value={distribution} onChange={setDistribution} options={DIST} />
              <p className="mt-1.5 text-xs text-slate-400">
                Arsa payı: tutar arsa payına göre bölünür · Eşit: tüm dairelere eşit bölünür.
                {distribution === 'arsa_payi' && ' Tüm dairelerde arsa payı dolu olmalı (Daireler ekranı).'}
              </p>
            </div>
          )}

          {mode === 'tekil' && (
            <Field label="Açıklama (opsiyonel)"><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="örn. Cam kırılması onarımı" className={inputCls} /></Field>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {result}</p>}

          <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Oluşturuluyor…' : mode === 'toplu' ? 'Tahakkuk Oluştur' : 'Borç Oluştur'}
          </button>
        </form>
      </Card>

      {ctOpen && (
        <Modal title="Yeni Tahakkuk Türü" onClose={() => setCtOpen(false)}>
          <form onSubmit={createCt} className="space-y-3">
            <Field label="Ad (ör. Aidat, Yakıt)"><input value={ctName} onChange={(e) => setCtName(e.target.value)} autoFocus className={inputCls} /></Field>
            <Field label="Varsayılan borçlu tipi"><Segmented value={ctTarget} onChange={setCtTarget} options={[{ value: 'kiraci', label: 'Kiracı' }, { value: 'malik', label: 'Malik' }]} /></Field>
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
