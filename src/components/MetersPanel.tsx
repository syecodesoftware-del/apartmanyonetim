'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type UnitRow = { id: string; block: string | null; apartment_number: string };
export type MeterRow = {
  id: string; kind: string; serial_no: string | null; active: boolean; unit_id: string;
  unit_label: string; last_reading: number | null; last_read_at: string | null; last_consumption: number | null;
};
type HistoryRow = { id: string; reading: number; read_at: string; note: string | null; consumption: number | null };

const KINDS: { key: string; label: string }[] = [
  { key: 'su', label: 'Su' },
  { key: 'elektrik', label: 'Elektrik' },
  { key: 'dogalgaz', label: 'Doğalgaz' },
  { key: 'kalorimetre', label: 'Kalorimetre' },
  { key: 'diger', label: 'Diğer' },
];
const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS.map((k) => [k.key, k.label]));

export function MetersPanel({ meters: initial, units }: { meters: MeterRow[]; units: UnitRow[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [meters, setMeters] = useState<MeterRow[]>(initial);
  const [kindFilter, setKindFilter] = useState('');
  const [busy, setBusy] = useState(false);

  // sayaç modal
  const [mOpen, setMOpen] = useState(false);
  const [mId, setMId] = useState<string | null>(null);
  const [mUnit, setMUnit] = useState('');
  const [mKind, setMKind] = useState('su');
  const [mSerial, setMSerial] = useState('');
  const [mActive, setMActive] = useState(true);
  const [mErr, setMErr] = useState('');

  // okuma modal
  const [rOpen, setROpen] = useState(false);
  const [rMeter, setRMeter] = useState<MeterRow | null>(null);
  const [rValue, setRValue] = useState('');
  const [rDate, setRDate] = useState('');
  const [rNote, setRNote] = useState('');
  const [rAllowDecrease, setRAllowDecrease] = useState(false);
  const [rErr, setRErr] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);

  async function reload() {
    const { data } = await supabaseBrowser().rpc('get_meters', { p_kind: undefined });
    setMeters((data ?? []) as unknown as MeterRow[]);
    router.refresh();
  }

  function openNewMeter() {
    setMId(null); setMUnit(units[0]?.id ?? ''); setMKind('su'); setMSerial(''); setMActive(true); setMErr(''); setMOpen(true);
  }
  function openEditMeter(m: MeterRow) {
    setMId(m.id); setMUnit(m.unit_id); setMKind(m.kind); setMSerial(m.serial_no ?? ''); setMActive(m.active); setMErr(''); setMOpen(true);
  }
  async function submitMeter() {
    if (!mUnit) { setMErr('Daire seçin.'); return; }
    setBusy(true); setMErr('');
    const { error } = await supabaseBrowser().rpc('save_meter', {
      p_id: mId, p_unit_id: mUnit, p_kind: mKind, p_serial_no: mSerial.trim() || undefined, p_active: mActive,
    });
    setBusy(false);
    if (error) { setMErr(friendlyDbMessage(error.message)); return; }
    setMOpen(false);
    await reload();
  }

  async function openReading(m: MeterRow) {
    setRMeter(m); setRValue(''); setRDate(''); setRNote(''); setRAllowDecrease(false); setRErr('');
    setROpen(true);
    const { data } = await supabaseBrowser().rpc('get_meter_history', { p_meter_id: m.id });
    setHistory((data ?? []) as unknown as HistoryRow[]);
  }
  async function submitReading() {
    if (!rMeter) return;
    const val = Number(rValue.replace(',', '.'));
    if (isNaN(val) || val < 0) { setRErr('Geçerli okuma girin.'); return; }
    setBusy(true); setRErr('');
    const { error } = await supabaseBrowser().rpc('record_meter_reading', {
      p_meter_id: rMeter.id, p_reading: val,
      p_read_at: rDate || undefined, p_note: rNote.trim() || undefined,
      p_allow_decrease: rAllowDecrease,
    });
    setBusy(false);
    if (error) {
      if (error.message.includes('READING_DECREASED')) {
        setRErr('Okuma öncekinden küçük. Sayaç değiştiyse aşağıdaki kutuyu işaretleyip tekrar kaydedin.');
      } else { setRErr(friendlyDbMessage(error.message)); }
      return;
    }
    setROpen(false);
    await reload();
  }

  const filtered = kindFilter ? meters.filter((m) => m.kind === kindFilter) : meters;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={kindFilter === ''} onClick={() => setKindFilter('')}>Tümü</FilterChip>
          {KINDS.map((k) => <FilterChip key={k.key} active={kindFilter === k.key} onClick={() => setKindFilter(k.key)}>{k.label}</FilterChip>)}
        </div>
        {!ro && (
          <button onClick={openNewMeter} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Sayaç Ekle
          </button>
        )}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState>Kayıtlı sayaç yok. Daire sayaçlarını ekleyin, okumaları girin.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Daire</Th><Th>Tür</Th><Th>Seri No</Th>
                  <Th className="text-right">Son Okuma</Th><Th>Tarih</Th>
                  <Th className="text-right">Son Tüketim</Th><Th>Durum</Th>
                  {!ro && <Th></Th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <Td className="font-medium">{m.unit_label}</Td>
                    <Td className="text-slate-500">{KIND_LABEL[m.kind] ?? m.kind}</Td>
                    <Td className="text-xs text-slate-400">{m.serial_no ?? '—'}</Td>
                    <Td className="text-right tabular-nums">{m.last_reading != null ? Number(m.last_reading).toLocaleString('tr-TR') : '—'}</Td>
                    <Td className="text-slate-400">{m.last_read_at ? date(m.last_read_at) : '—'}</Td>
                    <Td className="text-right tabular-nums text-slate-600">{m.last_consumption != null ? Number(m.last_consumption).toLocaleString('tr-TR') : '—'}</Td>
                    <Td>{m.active ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>}</Td>
                    {!ro && (
                      <Td className="whitespace-nowrap text-right">
                        <button onClick={() => openReading(m)} className="text-xs font-medium text-blue-600 hover:underline">Okuma Gir</button>
                        <button onClick={() => openEditMeter(m)} className="ml-3 text-xs text-slate-500 hover:underline">Düzenle</button>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Sayaç modal */}
      {mOpen && (
        <Modal title={mId ? 'Sayaç Düzenle' : 'Sayaç Ekle'} onClose={() => setMOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Daire *">
              <select value={mUnit} onChange={(e) => setMUnit(e.target.value)} className={inputCls}>
                {units.map((u) => <option key={u.id} value={u.id}>{u.block ? u.block + ' ' : ''}{u.apartment_number}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tür">
                <select value={mKind} onChange={(e) => setMKind(e.target.value)} className={inputCls}>
                  {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
              </Field>
              <Field label="Seri No"><input value={mSerial} onChange={(e) => setMSerial(e.target.value)} className={inputCls} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={mActive} onChange={(e) => setMActive(e.target.checked)} /> Aktif
            </label>
            {mErr && <p className="text-sm text-red-600">{mErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setMOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitMeter} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Okuma modal */}
      {rOpen && rMeter && (
        <Modal title={`Okuma Gir — ${rMeter.unit_label} · ${KIND_LABEL[rMeter.kind] ?? rMeter.kind}`} onClose={() => setROpen(false)}>
          <div className="flex flex-col gap-3">
            {rMeter.last_reading != null && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Son okuma: <span className="font-medium tabular-nums">{Number(rMeter.last_reading).toLocaleString('tr-TR')}</span>
                {rMeter.last_read_at ? ` (${date(rMeter.last_read_at)})` : ''}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Okuma Değeri *">
                <input value={rValue} onChange={(e) => setRValue(e.target.value)} className={inputCls} inputMode="decimal" autoFocus />
              </Field>
              <Field label="Okuma Tarihi">
                <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Not"><input value={rNote} onChange={(e) => setRNote(e.target.value)} className={inputCls} /></Field>
            <label className="flex items-center gap-2 text-sm text-amber-700">
              <input type="checkbox" checked={rAllowDecrease} onChange={(e) => setRAllowDecrease(e.target.checked)} />
              Sayaç değişti (öncekinden küçük okumaya izin ver)
            </label>
            {rErr && <p className="text-sm text-red-600">{rErr}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setROpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitReading} disabled={busy || !rValue} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>

            {history.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Geçmiş</p>
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <thead><tr><Th>Tarih</Th><Th className="text-right">Okuma</Th><Th className="text-right">Tüketim</Th><Th>Not</Th></tr></thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <Td className="text-slate-500">{date(h.read_at)}</Td>
                          <Td className="text-right tabular-nums">{Number(h.reading).toLocaleString('tr-TR')}</Td>
                          <Td className="text-right tabular-nums text-slate-500">{h.consumption != null ? Number(h.consumption).toLocaleString('tr-TR') : '—'}</Td>
                          <Td className="text-xs text-slate-400">{h.note ?? ''}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium transition ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
      {children}
    </button>
  );
}
