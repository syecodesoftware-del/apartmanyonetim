'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { inputCls, Modal, Field } from '@/components/UnitsPanel';
import { Segmented, Toggle } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { parseTrAmount, sanitizeAmountInput } from '@/lib/amount';
import { friendlyDbMessage } from '@/lib/error';

export type ChargeOption = { id: string; ad: string; is_active: boolean; borc_hedefi: string | null };
export type UnitOption = { id: string; block: string | null; apartment_number: string; arsa_payi: number | null };
export type BatchRow = {
  batch_id: string;
  created_at: string;
  charge_name: string | null;
  period_month: number | null;
  period_year: number | null;
  due_date: string | null;
  unit_count: number;
  total_amount: number;
  allocated_amount: number;
};

type Distribution = 'arsa_payi' | 'esit';
type AmountMode = 'daire' | 'toplam';
type DebtorType = 'kiraci' | 'malik';
type Mode = 'toplu' | 'tekil';
const DIST: { value: Distribution; label: string }[] = [
  { value: 'esit', label: 'Eşit' },
  { value: 'arsa_payi', label: 'Arsa payı' },
];
const AMOUNT_MODES: { value: AmountMode; label: string }[] = [
  { value: 'daire', label: 'Daire başına' },
  { value: 'toplam', label: 'Toplam (bölünür)' },
];
const DEBTOR: { value: DebtorType; label: string }[] = [
  { value: 'kiraci', label: 'Kiracı' },
  { value: 'malik', label: 'Mülk Sahibi' },
];
const MODES: { value: Mode; label: string }[] = [
  { value: 'toplu', label: 'Toplu Tahakkuk' },
  { value: 'tekil', label: 'Tek Daireye Borç' },
];
const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function unitLabel(u: UnitOption) {
  return `${u.block ? u.block + ' ' : ''}Daire ${u.apartment_number}`;
}

/** Çekirdek dağıtımın birebir önizlemesi: round(2) + kuruş farkı son daireye. */
function computePreview(units: UnitOption[], amt: number, dist: 'arsa_payi' | 'esit' | 'sabit') {
  const n = units.length;
  const paySum = units.reduce((s, u) => s + (u.arsa_payi ?? 0), 0);
  const rows = units.map((u) => {
    let v = 0;
    if (dist === 'sabit') v = Math.round(amt * 100) / 100;
    else if (dist === 'esit') v = Math.round((amt / n) * 100) / 100;
    else v = paySum > 0 ? Math.round(((amt * (u.arsa_payi ?? 0)) / paySum) * 100) / 100 : 0;
    return { unit: u, tutar: v };
  });
  if (dist !== 'sabit') {
    const assigned = rows.reduce((s, r) => s + r.tutar, 0);
    const diff = Math.round((amt - assigned) * 100) / 100;
    const lastNonZero = [...rows].reverse().find((r) => r.tutar > 0);
    if (diff !== 0 && lastNonZero && lastNonZero.tutar + diff > 0) lastNonZero.tutar = Math.round((lastNonZero.tutar + diff) * 100) / 100;
  }
  return rows;
}

export type NotifyChannels = { push: boolean; sms: boolean; email: boolean; whatsapp: boolean };
const CHANNEL_META: { key: keyof NotifyChannels; label: string; icon: string; hint?: string }[] = [
  { key: 'push', label: 'Uygulama Bildirimi', icon: '🔔' },
  { key: 'sms', label: 'SMS', icon: '💬', hint: 'sağlayıcı bekliyor' },
  { key: 'email', label: 'E-posta', icon: '✉️', hint: 'sağlayıcı bekliyor' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '🟢', hint: 'sağlayıcı bekliyor' },
];

export function AccrualsForm({ chargeTypes, units, siteId, batches = [], activePlans = [], notifyDefaults }: {
  chargeTypes: ChargeOption[]; units: UnitOption[]; siteId: string; batches?: BatchRow[];
  /** Rapor #30: aktif aidat planı varken aynı ay için elle aidat üretme (çift borç) uyarısı. */
  activePlans?: { name: string; amount: number }[];
  /** Rapor Madde 8: site varsayılan bildirim kanalları (notification_defaults). */
  notifyDefaults?: NotifyChannels;
}) {
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
  const [distribution, setDistribution] = useState<Distribution>('esit');
  const [amountMode, setAmountMode] = useState<AmountMode>('daire');
  const [unitId, setUnitId] = useState<string>(units[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Rapor Madde 8: borç oluşturulurken kullanılacak bildirim kanalları
  const [channels, setChannels] = useState<NotifyChannels>(
    notifyDefaults ?? { push: true, sms: false, email: false, whatsapp: false },
  );

  // Önizleme (toplu tahakkuk yalnız buradan onaylanarak oluşturulur)
  const [preview, setPreview] = useState<null | { rows: { unit: UnitOption; tutar: number }[]; dist: 'arsa_payi' | 'esit' | 'sabit'; amt: number }>(null);

  // Parti iptali
  const [cancelBatch, setCancelBatch] = useState<BatchRow | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Yeni tahakkuk türü modalı
  const [ctOpen, setCtOpen] = useState(false);
  const [ctName, setCtName] = useState('');
  const [ctTarget, setCtTarget] = useState<'malik' | 'kiraci'>('kiraci');
  const [ctLate, setCtLate] = useState(true);
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
      .insert({ site_id: siteId, ad: ctName.trim(), borc_hedefi: ctTarget, gecikme_uygula: ctLate, is_icra: false })
      .select('id').single();
    setCtSaving(false);
    if (error || !data) { alert('Tür eklenemedi: ' + (error?.message ?? '')); return; }
    setCtOpen(false); setCtName(''); setCtTarget('kiraci'); setCtLate(true);
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

  // Toplu: önce önizleme
  function openPreview(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    const amt = validateCommon();
    if (amt == null) return;
    const m = Number(month), y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12) { setError('Ay 1-12 arasında olmalı.'); return; }
    if (!Number.isInteger(y) || y < 2020 || y > 2100) { setError('Geçerli bir yıl giriniz.'); return; }
    if (units.length === 0) { setError('Sitede daire tanımlı değil.'); return; }
    const dist: 'arsa_payi' | 'esit' | 'sabit' =
      distribution === 'arsa_payi' ? 'arsa_payi' : amountMode === 'daire' ? 'sabit' : 'esit';
    if (dist === 'arsa_payi' && units.reduce((s, u) => s + (u.arsa_payi ?? 0), 0) <= 0) {
      setError('Arsa payı toplamı 0 — önce Daireler ekranından arsa paylarını girin.');
      return;
    }
    setPreview({ rows: computePreview(units, amt, dist), dist, amt });
  }

  const selectedChannels = () =>
    (Object.keys(channels) as (keyof NotifyChannels)[]).filter((k) => channels[k]);

  /** Borç oluşturduktan sonra seçili kanallara bildirim gönderir; hata olsa da tahakkuk bozulmaz. */
  async function notifyBatch(batchId: string): Promise<string> {
    const chans = selectedChannels();
    if (chans.length === 0) return '';
    const { data, error } = await supabaseBrowser().rpc('notify_accrual_batch', {
      p_batch_id: batchId, p_channels: chans,
    });
    if (error) return ' (Bildirim gönderilemedi: ' + error.message + ')';
    const r = (data ?? {}) as { in_app?: number; queued?: number; skipped?: number };
    const parts: string[] = [];
    if (r.in_app) parts.push(`${r.in_app} uygulama bildirimi`);
    if (r.queued) parts.push(`${r.queued} mesaj kuyruğa alındı`);
    return parts.length ? ` Bildirim: ${parts.join(', ')}.` : '';
  }

  async function confirmGenerate() {
    if (!preview) return;
    setBusy(true); setError('');
    const batchId = crypto.randomUUID();
    const { data, error } = await supabaseBrowser().rpc('generate_accruals', {
      p_site_id: siteId, p_charge_type_id: chargeTypeId!,
      p_period_month: Number(month), p_period_year: Number(year),
      p_due_date: dueDate, p_amount: preview.amt, p_distribution: preview.dist,
      p_debtor_type: debtorType, p_batch_id: batchId,
    });
    if (error) { setBusy(false); setPreview(null); setError(friendlyDbMessage(error.message)); return; }
    const notifyMsg = (data ?? 0) > 0 ? await notifyBatch(batchId) : '';
    setBusy(false);
    setPreview(null);
    setResult(`${data ?? 0} daireye borç tahakkuk ettirildi (borçlu: ${debtorType === 'kiraci' ? 'kiracı' : 'mülk sahibi'}).${notifyMsg} Yanlışlık varsa aşağıdaki parti listesinden geri alabilirsiniz.`);
    router.refresh();
  }

  async function confirmCancelBatch() {
    if (!cancelBatch) return;
    setCancelBusy(true); setCancelError('');
    const { data, error } = await supabaseBrowser().rpc('cancel_accrual_batch', { p_batch_id: cancelBatch.batch_id });
    setCancelBusy(false);
    if (error) { setCancelError(friendlyDbMessage(error.message)); return; }
    setCancelBatch(null);
    setResult(`${data ?? 0} tahakkuk geri alındı.`);
    router.refresh();
  }

  async function createSingle(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    if (!unitId) { setError('Daire seçiniz.'); return; }
    const amt = validateCommon();
    if (amt == null) return;
    setBusy(true);
    const batchId = crypto.randomUUID();
    const { error } = await supabaseBrowser().rpc('create_unit_accrual', {
      p_unit_id: unitId, p_charge_type_id: chargeTypeId!,
      p_amount: amt, p_due_date: dueDate, p_debtor_type: debtorType,
      p_description: description.trim() || undefined, p_batch_id: batchId,
    });
    if (error) { setBusy(false); setError(friendlyDbMessage(error.message)); return; }
    const notifyMsg = await notifyBatch(batchId);
    setBusy(false);
    const u = units.find((x) => x.id === unitId);
    setResult(`${u ? unitLabel(u) : 'Daire'} için ${debtorType === 'kiraci' ? 'kiracıya' : 'mülk sahibine'} borç oluşturuldu.${notifyMsg}`);
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

  const previewTotal = preview ? preview.rows.reduce((s, r) => s + r.tutar, 0) : 0;

  return (
    <div className="max-w-3xl space-y-4">
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
        💡 Aylık sabit aidat için <a href="/dues-plans" className="font-semibold underline">Aidat Planları</a>'nı kullanın — plan her ay otomatik tahakkuk eder.
        Bu ekran <b>ek / tek seferlik</b> borçlar içindir (demirbaş, yakıt farkı, ceza vb.).
      </p>
      {activePlans.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ Aktif aidat planınız var ({activePlans.map((p) => p.name).join(', ')}). Aynı ay için buradan tekrar
          "aidat" üretirseniz daireler <b>çift borçlanır</b> — bu ekranı yalnız plan dışı kalemler için kullanın.
        </p>
      )}
      <Segmented value={mode} onChange={setMode} options={MODES} />
      <Card className="max-w-xl">
        <form onSubmit={mode === 'toplu' ? openPreview : createSingle} className="space-y-4">
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

          {mode === 'toplu' && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Dağıtım Anahtarı</p>
              <Segmented value={distribution} onChange={setDistribution} options={DIST} />
              {distribution === 'esit' ? (
                <div className="mt-2">
                  <Segmented value={amountMode} onChange={setAmountMode} options={AMOUNT_MODES} />
                  <p className="mt-1.5 text-xs text-slate-400">
                    {amountMode === 'daire'
                      ? 'Girdiğiniz tutar her daireye AYNEN yazılır (genel kurul kararındaki “aidat X TL” için bunu kullanın).'
                      : `Girdiğiniz TOPLAM tutar ${units.length} daireye eşit bölünür.`}
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">
                  Girdiğiniz TOPLAM tutar arsa payına göre bölünür. Tüm dairelerde arsa payı dolu olmalı (Daireler ekranı).
                </p>
              )}
            </div>
          )}

          <Field label={mode === 'tekil' ? 'Tutar (₺)' : distribution === 'esit' && amountMode === 'daire' ? 'Daire Başına Tutar (₺)' : 'Toplam Tutar (₺)'}>
            <input value={amount} onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" placeholder="örn. 750 veya 1.234,50" className={inputCls} />
          </Field>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Borçlu Tipi</p>
            <Segmented value={debtorType} onChange={setDebtorType} options={DEBTOR} />
            <p className="mt-1.5 text-xs text-slate-400">
              Borç daireye kaydedilir; seçilen tipin o anki sorumlusu borçlu olur. Kişi değişse bile eski borçların sorumlusu değişmez.
              {mode === 'toplu' && debtorType === 'kiraci' && ' Kiracısı olmayan dairelerde borç mülk sahibine yazılır.'}
            </p>
          </div>

          {mode === 'tekil' && (
            <Field label="Açıklama (opsiyonel)"><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="örn. Cam kırılması onarımı" className={inputCls} /></Field>
          )}

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-1 text-xs font-medium text-slate-600">Bildirim Kanalları</p>
            <p className="mb-2 text-xs text-slate-400">Borç oluşturulunca borçluya seçili kanallardan bildirilir. Uygulama bildirimi anında gider; SMS/e-posta/WhatsApp sağlayıcı bağlanınca gönderilmek üzere kuyruğa alınır.</p>
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_META.map((c) => (
                <label key={c.key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">
                    {c.icon} {c.label}
                    {c.hint && <span className="ml-1 text-[10px] text-slate-400">({c.hint})</span>}
                  </span>
                  <Toggle checked={channels[c.key]} onChange={(v) => setChannels((s) => ({ ...s, [c.key]: v }))} />
                </label>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {result}</p>}

          <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Oluşturuluyor…' : mode === 'toplu' ? 'Dağılımı Önizle' : 'Borç Oluştur'}
          </button>
        </form>
      </Card>

      {/* Son toplu tahakkuklar — geri alma buradan */}
      {batches.length > 0 && (
        <Card title="Son Toplu Tahakkuklar">
          <Table>
            <thead>
              <tr>
                <Th>Tarih</Th><Th>Tür / Dönem</Th><Th className="text-right">Daire</Th><Th className="text-right">Toplam</Th><Th>Tahsilat</Th><Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const hasPayment = Number(b.allocated_amount) > 0.005;
                return (
                  <tr key={b.batch_id} className="hover:bg-slate-50">
                    <Td className="text-slate-500">{date(b.created_at)}</Td>
                    <Td className="font-medium text-slate-800">
                      {b.charge_name ?? 'Tahakkuk'}
                      {b.period_month && b.period_year ? <span className="ml-1 text-xs font-normal text-slate-400">{AY[b.period_month - 1]} {b.period_year}</span> : null}
                    </Td>
                    <Td className="text-right tabular-nums">{b.unit_count}</Td>
                    <Td className="text-right font-semibold tabular-nums">{money(Number(b.total_amount), true)}</Td>
                    <Td>{hasPayment ? <Badge tone="amber">ödeme başladı</Badge> : <Badge tone="slate">ödeme yok</Badge>}</Td>
                    <Td className="text-right">
                      <button onClick={() => { setCancelBatch(b); setCancelError(''); }} className="text-xs font-semibold text-red-600 hover:underline">Geri Al</button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Önizleme modalı */}
      {preview && (
        <Modal title="Dağılım Önizlemesi — Onayınız Gerekli" onClose={() => setPreview(null)}>
          <p className="mb-2 text-sm text-slate-600">
            <span className="font-semibold">{units.length} daireye</span>, {AY[Number(month) - 1]} {year} dönemi, vade {date(dueDate)}.
            Borçlu: <span className="font-semibold">{debtorType === 'kiraci' ? 'Kiracı' : 'Mülk Sahibi'}</span>.
          </p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-500">Daire</th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold text-slate-500">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((r) => (
                  <tr key={r.unit.id}>
                    <td className="px-3 py-1.5 text-slate-700">{unitLabel(r.unit)}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${r.tutar <= 0 ? 'text-slate-300' : 'text-slate-800'}`}>
                      {r.tutar <= 0 ? 'atlanır (0)' : money(r.tutar, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-sm font-medium text-slate-500">Toplam</span>
            <span className="text-base font-bold tabular-nums text-slate-800">{money(previewTotal, true)}</span>
          </div>
          {preview.dist !== 'sabit' && <p className="mt-1 text-xs text-slate-400">Kuruş yuvarlama farkı listedeki son daireye yansıtılır.</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setPreview(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
            <button onClick={confirmGenerate} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {busy ? 'Oluşturuluyor…' : 'Onayla ve Oluştur'}
            </button>
          </div>
        </Modal>
      )}

      {/* Parti iptal modalı */}
      {cancelBatch && (
        <Modal title="Toplu Tahakkuku Geri Al" onClose={() => setCancelBatch(null)}>
          <p className="mb-2 text-sm text-slate-600">
            <span className="font-semibold">{cancelBatch.charge_name ?? 'Tahakkuk'}</span>
            {cancelBatch.period_month && cancelBatch.period_year ? ` (${AY[cancelBatch.period_month - 1]} ${cancelBatch.period_year})` : ''} —{' '}
            {cancelBatch.unit_count} daire, toplam {money(Number(cancelBatch.total_amount), true)} silinecek.
          </p>
          {Number(cancelBatch.allocated_amount) > 0.005 && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ Bu partiye {money(Number(cancelBatch.allocated_amount), true)} ödeme mahsup edilmiş.
              Geri alırsanız bu ödemeler silinmez; ilgili dairelerde avans olarak kalır ve varsa diğer açık borçlara otomatik mahsup edilir.
            </p>
          )}
          {cancelError && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{cancelError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCancelBatch(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
            <button onClick={confirmCancelBatch} disabled={cancelBusy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
              {cancelBusy ? 'Geri alınıyor…' : 'Partiyi Geri Al'}
            </button>
          </div>
        </Modal>
      )}

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
