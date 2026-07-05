'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { useReadOnly } from '@/components/ReadOnly';
import { parseTrDecimal, sanitizeAmountInput } from '@/lib/amount';

export type UnitRow = {
  id: string;
  block: string | null;
  apartment_number: string;
  floor: number | null;
  arsa_payi: number | null;
  m2: number | null;
  ada_id: string | null;
};
export type BlockOption = { id: string; name: string };

type FormState = { block: string; apartment_number: string; floor: string; arsa_payi: string; m2: string; ada_id: string };
const empty: FormState = { block: '', apartment_number: '', floor: '', arsa_payi: '', m2: '', ada_id: '' };

export function UnitsPanel({ units, blockOptions, siteId }: { units: UnitRow[]; blockOptions: BlockOption[]; siteId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adaName = (id: string | null) => blockOptions.find((b) => b.id === id)?.name ?? null;
  const totalArsaPayi = units.reduce((s, u) => s + (u.arsa_payi ?? 0), 0);
  const arsaOff = totalArsaPayi > 0 && Math.abs(totalArsaPayi - 1) > 0.01 && Math.abs(totalArsaPayi - 100) > 0.5;

  function set<K extends keyof FormState>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function openNew() { setEditId(null); setForm({ ...empty }); setError(null); setOpen(true); }
  function openEdit(u: UnitRow) {
    setEditId(u.id);
    setForm({
      block: u.block ?? '', apartment_number: u.apartment_number,
      floor: u.floor?.toString() ?? '', arsa_payi: u.arsa_payi?.toString() ?? '',
      m2: u.m2?.toString() ?? '', ada_id: u.ada_id ?? '',
    });
    setError(null); setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.apartment_number.trim()) { setError('Daire no zorunludur.'); return; }
    const floorNum = form.floor.trim() ? Number(form.floor) : null;
    if (floorNum !== null && !Number.isInteger(floorNum)) { setError('Kat tam sayı olmalıdır.'); return; }
    const arsaNum = form.arsa_payi.trim() ? parseTrDecimal(form.arsa_payi) : null;
    if (arsaNum !== null && (!Number.isFinite(arsaNum) || arsaNum < 0)) { setError('Geçerli bir arsa payı giriniz (örn. 0,0125).'); return; }
    const m2Num = form.m2.trim() ? parseTrDecimal(form.m2) : null;
    if (m2Num !== null && (!Number.isFinite(m2Num) || m2Num <= 0)) { setError('Geçerli bir m² giriniz (örn. 120 veya 95,5).'); return; }
    const payload = {
      block: form.block.trim() || null,
      apartment_number: form.apartment_number.trim(),
      floor: floorNum,
      arsa_payi: arsaNum,
      m2: m2Num,
      ada_id: form.ada_id || null,
    };
    setSaving(true);
    const sb = supabaseBrowser();
    const { error } = editId
      ? await sb.from('units').update(payload).eq('id', editId)
      : await sb.from('units').insert({ site_id: siteId, ...payload });
    setSaving(false);
    if (error) { setError(error.code === '23505' ? 'Bu blok/daire zaten kayıtlı.' : error.message); return; }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Card
        title="Daire Listesi"
        action={
          <div className="flex items-center gap-3">
            <span className={`text-xs ${arsaOff ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
              Toplam arsa payı: {totalArsaPayi.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
              {arsaOff ? ' ⚠ (ideal 1.0 / 100)' : ''}
            </span>
            {!ro && <button onClick={openNew} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ Daire</button>}
          </div>
        }
      >
        {units.length === 0 ? (
          <EmptyState>Henüz daire eklenmedi.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr><Th>Blok</Th><Th>Daire</Th><Th>Kat</Th><Th>Ada</Th><Th className="text-right">Arsa Payı</Th><Th className="text-right">İşlem</Th></tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <Td>{u.block ?? '—'}</Td>
                  <Td className="font-medium text-slate-800">{u.apartment_number}</Td>
                  <Td>{u.floor ?? '—'}</Td>
                  <Td>{adaName(u.ada_id) ? <Badge tone="blue">{adaName(u.ada_id)}</Badge> : '—'}</Td>
                  <Td className="text-right">{u.arsa_payi ?? '—'}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/units/${u.id}`} className="text-xs font-semibold text-blue-600 hover:underline">Detay</Link>
                      {!ro && <button onClick={() => openEdit(u)} className="text-xs font-semibold text-slate-500 hover:underline">Düzenle</button>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {open && (
        <Modal title={editId ? 'Daireyi Düzenle' : 'Yeni Daire'} onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-3">
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
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}
