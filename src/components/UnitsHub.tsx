'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { Segmented } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { money } from '@/lib/format';
import { parseTrDecimal, parseTrAmount, sanitizeAmountInput } from '@/lib/amount';
import { todayLocalISO } from '@/lib/date';
import { friendlyDbMessage } from '@/lib/error';

/** Daire 360 — Sakinler + Borç & Tahsilat + Ödemeyenler tek tabloda.
 *  Satıra tıklayınca daire detayı popup açılır (intercepting route). */

export type Occupant = { full_name: string; phone: string | null; has_account: boolean };
export type HubRow = {
  id: string;
  block: string | null;
  apartment_number: string;
  floor: number | null;
  arsa_payi: number | null;
  m2: number | null;
  ada_id: string | null;
  malik: Occupant | null;
  kiraci: Occupant | null;
  toplam_borc: number;
  avans: number;
  net_borc: number;
};
export type BlockOption = { id: string; name: string };

type Filter = 'all' | 'borclu' | 'kiracili' | 'uygulamasiz';
type FormState = { block: string; apartment_number: string; floor: string; arsa_payi: string; m2: string; ada_id: string };
const emptyForm: FormState = { block: '', apartment_number: '', floor: '', arsa_payi: '', m2: '', ada_id: '' };

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
    active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
  }`;

function OccupantCell({ o }: { o: Occupant | null }) {
  if (!o) return <span className="text-slate-300">—</span>;
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
        {o.full_name}
        <span
          title={o.has_account ? 'Mobil uygulamayı kullanıyor' : 'Mobil uygulaması yok'}
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${o.has_account ? 'bg-emerald-500' : 'bg-slate-300'}`}
        />
      </p>
      <p className="truncate text-xs text-slate-400">{o.phone ?? ''}</p>
    </div>
  );
}

export function UnitsHub({ rows, blockOptions, siteId, initialFilter }: {
  rows: HubRow[];
  blockOptions: BlockOption[];
  siteId: string;
  initialFilter?: string;
}) {
  const router = useRouter();
  const ro = useReadOnly();

  // Arama + filtre
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>(
    initialFilter === 'borclu' || initialFilter === 'kiracili' || initialFilter === 'uygulamasiz' ? initialFilter : 'all',
  );
  const [blockFilter, setBlockFilter] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  // Daire ekle/düzenle modalı
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Tahsilat modalı
  const [target, setTarget] = useState<HubRow | null>(null);
  const [amount, setAmount] = useState('');
  // 'bank' — collections_method_check yalnız cash/bank/online/qr kabul eder
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState('');

  // Gecikme hesaplama
  const [asOf, setAsOf] = useState(todayLocalISO());
  const [runningLate, setRunningLate] = useState(false);

  const blockNames = useMemo(
    () => [...new Set(rows.map((r) => r.block).filter((b): b is string => !!b))].sort((a, b) => a.localeCompare(b, 'tr')),
    [rows],
  );

  const term = q.trim().toLocaleLowerCase('tr');
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'borclu' && r.net_borc <= 0.005) return false;
      if (filter === 'kiracili' && !r.kiraci) return false;
      if (filter === 'uygulamasiz') {
        const anyOcc = r.malik || r.kiraci;
        const anyApp = (r.malik?.has_account ?? false) || (r.kiraci?.has_account ?? false);
        if (!anyOcc || anyApp) return false;
      }
      if (blockFilter && r.block !== blockFilter) return false;
      if (term) {
        const hay = [r.block, r.apartment_number, r.malik?.full_name, r.malik?.phone, r.kiraci?.full_name, r.kiraci?.phone]
          .filter(Boolean)
          .some((v) => String(v).toLocaleLowerCase('tr').includes(term));
        if (!hay) return false;
      }
      return true;
    });
  }, [rows, filter, blockFilter, term]);

  const totalArsaPayi = rows.reduce((s, u) => s + (u.arsa_payi ?? 0), 0);
  const arsaOff = totalArsaPayi > 0 && Math.abs(totalArsaPayi - 1) > 0.01 && Math.abs(totalArsaPayi - 100) > 0.5;

  function set<K extends keyof FormState>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  function openNew() { setEditId(null); setForm({ ...emptyForm }); setFormError(null); setFormOpen(true); }
  function openEdit(u: HubRow) {
    setEditId(u.id);
    setForm({
      block: u.block ?? '', apartment_number: u.apartment_number,
      floor: u.floor?.toString() ?? '', arsa_payi: u.arsa_payi?.toString() ?? '',
      m2: u.m2?.toString() ?? '', ada_id: u.ada_id ?? '',
    });
    setFormError(null); setFormOpen(true);
  }

  async function saveUnit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.apartment_number.trim()) { setFormError('Daire no zorunludur.'); return; }
    const floorNum = form.floor.trim() ? Number(form.floor) : null;
    if (floorNum !== null && !Number.isInteger(floorNum)) { setFormError('Kat tam sayı olmalıdır.'); return; }
    const arsaNum = form.arsa_payi.trim() ? parseTrDecimal(form.arsa_payi) : null;
    if (arsaNum !== null && (!Number.isFinite(arsaNum) || arsaNum < 0)) { setFormError('Geçerli bir arsa payı giriniz (örn. 0,0125).'); return; }
    const m2Num = form.m2.trim() ? parseTrDecimal(form.m2) : null;
    if (m2Num !== null && (!Number.isFinite(m2Num) || m2Num <= 0)) { setFormError('Geçerli bir m² giriniz (örn. 120 veya 95,5).'); return; }
    const payload = {
      block: form.block.trim() || null,
      apartment_number: form.apartment_number.trim(),
      floor: floorNum, arsa_payi: arsaNum, m2: m2Num,
      ada_id: form.ada_id || null,
    };
    setSaving(true);
    const sb = supabaseBrowser();
    const { error } = editId
      ? await sb.from('units').update(payload).eq('id', editId)
      : await sb.from('units').insert({ site_id: siteId, ...payload });
    setSaving(false);
    if (error) { setFormError(error.code === '23505' ? 'Bu blok/daire zaten kayıtlı.' : error.message); return; }
    setFormOpen(false);
    router.refresh();
  }

  function openCollect(r: HubRow) {
    setTarget(r);
    setAmount(r.net_borc > 0.005 ? String(Math.round(r.net_borc * 100) / 100) : '');
    setMethod('cash'); setCollectError(''); setInfo(null);
  }

  async function collect(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    const amt = parseTrAmount(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setCollectError('Geçerli bir tutar giriniz (örn. 750 veya 1.234,50).'); return; }
    setCollecting(true); setCollectError('');
    const { data, error } = await supabaseBrowser().rpc('record_collection', {
      p_site_id: siteId, p_unit_id: target.id, p_amount: amt, p_method: method,
    });
    setCollecting(false);
    if (error) { setCollectError(friendlyDbMessage(error.message)); return; }
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

  const unitLabel = (r: HubRow) => [r.block, r.apartment_number].filter(Boolean).join(' / ') || '—';

  return (
    <>
      {info && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {info}</p>}

      {/* Arama + filtre + işlemler */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Daire, isim veya telefon ara…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>Tümü</button>
          <button className={chip(filter === 'borclu')} onClick={() => setFilter('borclu')}>Borçlu</button>
          <button className={chip(filter === 'kiracili')} onClick={() => setFilter('kiracili')}>Kiracılı</button>
          <button className={chip(filter === 'uygulamasiz')} onClick={() => setFilter('uygulamasiz')}>Uygulaması Olmayan</button>
          {blockNames.length > 1 && (
            <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-500">
              <option value="">Tüm bloklar</option>
              {blockNames.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
        </div>
        {!ro && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500" />
            <button onClick={runLateFees} disabled={runningLate} className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60">
              {runningLate ? '…' : 'Gecikme Hesapla'}
            </button>
            <Link href="/onboarding" className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">📥 Toplu Aktarım</Link>
            <button onClick={openNew} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ Daire</button>
          </div>
        )}
      </div>

      <Card
        title={`Daireler (${filtered.length})`}
        action={
          <span className={`text-xs ${arsaOff ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
            Toplam arsa payı: {totalArsaPayi.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
            {arsaOff ? ' ⚠ (ideal 1.0 / 100)' : ''}
          </span>
        }
      >
        {rows.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">Henüz daire yok — en hızlı başlangıç Excel ile toplu aktarım.</p>
            {!ro && (
              <div className="mt-4 flex justify-center gap-2">
                <Link href="/onboarding" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">📥 Toplu Aktarıma Git</Link>
                <button onClick={openNew} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">+ Tek Daire Ekle</button>
              </div>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState>Filtreyle eşleşen daire yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Daire</Th>
                <Th>Mülk Sahibi</Th>
                <Th>Kiracı</Th>
                <Th className="text-right">Net Borç</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/units/${r.id}`)}
                  className="cursor-pointer hover:bg-blue-50/40"
                  title="Daire detayını aç"
                >
                  <Td>
                    <p className="text-sm font-semibold text-slate-800">{unitLabel(r)}</p>
                    <p className="text-xs text-slate-400">
                      {[r.floor != null ? `Kat ${r.floor}` : null, blockOptions.find((b) => b.id === r.ada_id)?.name].filter(Boolean).join(' · ') || ''}
                    </p>
                  </Td>
                  <Td><OccupantCell o={r.malik} /></Td>
                  <Td>{r.kiraci ? <OccupantCell o={r.kiraci} /> : <span className="text-xs text-slate-400">Malik oturuyor</span>}</Td>
                  <Td className="text-right">
                    <span className={`font-semibold tabular-nums ${r.net_borc > 0.005 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {money(r.net_borc, true)}
                    </span>
                    {r.avans > 0.005 && <p className="text-xs text-emerald-600">avans {money(r.avans, true)}</p>}
                  </Td>
                  <Td className="text-right" >
                    <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      {!ro && r.net_borc > 0.005 && (
                        <button onClick={() => openCollect(r)} className="text-xs font-semibold text-emerald-600 hover:underline">Tahsilat Al</button>
                      )}
                      <Link href={`/units/${r.id}`} className="text-xs font-semibold text-blue-600 hover:underline">Detay</Link>
                      {!ro && <button onClick={() => openEdit(r)} className="text-xs font-semibold text-slate-500 hover:underline">Düzenle</button>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {formOpen && (
        <Modal title={editId ? 'Daireyi Düzenle' : 'Yeni Daire'} onClose={() => setFormOpen(false)}>
          <form onSubmit={saveUnit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Blok"><input value={form.block} onChange={(e) => set('block', e.target.value)} className={inputCls} /></Field>
              <Field label="Daire No *"><input value={form.apartment_number} onChange={(e) => set('apartment_number', e.target.value)} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Kat"><input value={form.floor} onChange={(e) => set('floor', e.target.value)} inputMode="numeric" className={inputCls} /></Field>
              <Field label="Arsa Payı"><input value={form.arsa_payi} onChange={(e) => set('arsa_payi', sanitizeAmountInput(e.target.value))} inputMode="decimal" placeholder="örn. 0,0125" className={inputCls} /></Field>
            </div>
            <Field label="Ada / Blok grubu">
              <select value={form.ada_id} onChange={(e) => set('ada_id', e.target.value)} className={inputCls}>
                <option value="">Ada yok</option>
                {blockOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}

      {target && (
        <Modal title="Tahsilat Al" onClose={() => setTarget(null)}>
          <p className="mb-3 text-sm text-slate-500">
            {unitLabel(target)} · Açık borç: <span className="font-semibold text-slate-700">{money(target.toplam_borc, true)}</span>
            {target.avans > 0.005 && <> · Avans: <span className="font-semibold text-emerald-600">{money(target.avans, true)}</span> (yeni tahakkukta otomatik mahsup edilir)</>}
          </p>
          <form onSubmit={collect} className="space-y-3">
            <Field label="Tutar (₺)"><input value={amount} onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" autoFocus placeholder="örn. 750 veya 1.234,50" className={inputCls} /></Field>
            <Field label="Yöntem"><Segmented value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Nakit' }, { value: 'bank', label: 'Havale/EFT' }]} /></Field>
            <p className="text-xs text-slate-400">Tahsilat en eski borçtan başlanarak mahsup edilir; artan tutar avans olarak kaydedilir.</p>
            {collectError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{collectError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={collecting} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{collecting ? 'Kaydediliyor…' : 'Tahsilatı Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
