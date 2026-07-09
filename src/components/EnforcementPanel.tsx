'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type EnforcementCase = {
  id: string;
  unit_id: string;
  block: string | null;
  apartment_number: string | null;
  debtor_name: string | null;
  status: string;
  case_no: string | null;
  lawyer: string | null;
  debt_at_open: number;
  current_debt: number;
  note: string | null;
  opened_at: string;
  closed_at: string | null;
};

export type DebtorUnit = { unit_id: string; block: string | null; apartment_number: string | null; net_borc: number };

const STATUS_TONE: Record<string, 'amber' | 'red' | 'slate'> = { takip: 'amber', icra: 'red', kapandi: 'slate' };
const STATUS_LABEL: Record<string, string> = { takip: 'Takipte', icra: 'İcrada', kapandi: 'Kapandı' };

function unitLabel(block: string | null, apt: string | null) {
  return `${block ? block + ' ' : ''}${apt ?? '—'}`;
}

export function EnforcementPanel({ cases: initial, debtors }: { cases: EnforcementCase[]; debtors: DebtorUnit[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [cases, setCases] = useState<EnforcementCase[]>(initial);
  const [showClosed, setShowClosed] = useState(false);
  const [busy, setBusy] = useState(false);

  // open modal
  const [openModal, setOpenModal] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [status, setStatus] = useState('takip');
  const [caseNo, setCaseNo] = useState('');
  const [lawyer, setLawyer] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const openUnitIds = new Set(cases.filter((c) => c.status !== 'kapandi').map((c) => c.unit_id));
  const availableDebtors = debtors.filter((d) => !openUnitIds.has(d.unit_id));

  async function reload(includeClosed: boolean) {
    setBusy(true);
    const { data } = await supabaseBrowser().rpc('get_enforcement_cases', { p_include_closed: includeClosed });
    setBusy(false);
    setCases((data ?? []) as EnforcementCase[]);
  }

  async function toggleClosed() {
    const next = !showClosed;
    setShowClosed(next);
    await reload(next);
  }

  async function submitOpen() {
    if (!unitId) { setErr('Daire seçin.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('open_enforcement', {
      p_unit_id: unitId,
      p_status: status,
      p_case_no: caseNo.trim() || undefined,
      p_lawyer: lawyer.trim() || undefined,
      p_note: note.trim() || undefined,
    });
    setBusy(false);
    if (error) { setErr(friendlyDbMessage(error.message)); return; }
    setOpenModal(false); setUnitId(''); setStatus('takip'); setCaseNo(''); setLawyer(''); setNote('');
    router.refresh();
    await reload(showClosed);
  }

  async function changeStatus(c: EnforcementCase, newStatus: string) {
    const verb = newStatus === 'icra' ? 'icraya çevrilsin' : newStatus === 'kapandi' ? 'kapatılsın' : 'güncellensin';
    if (!confirm(`${unitLabel(c.block, c.apartment_number)} dosyası ${verb} mı?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('update_enforcement', { p_case_id: c.id, p_status: newStatus });
    setBusy(false);
    if (error) { alert('Güncellenemedi: ' + friendlyDbMessage(error.message)); return; }
    await reload(showClosed);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showClosed} onChange={toggleClosed} disabled={busy} />
          Kapanan dosyaları da göster
        </label>
        {!ro && (
          <button
            onClick={() => { setErr(''); setOpenModal(true); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Takibe Al
          </button>
        )}
      </div>

      <Card>
        {cases.length === 0 ? (
          <EmptyState>Açık takip / icra dosyası yok.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Daire</Th>
                  <Th>Borçlu</Th>
                  <Th>Durum</Th>
                  <Th>Dosya No</Th>
                  <Th>Avukat</Th>
                  <Th className="text-right">Açılış Borcu</Th>
                  <Th className="text-right">Güncel Borç</Th>
                  <Th>Açılış</Th>
                  {!ro && <Th></Th>}
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <Td>{unitLabel(c.block, c.apartment_number)}</Td>
                    <Td>{c.debtor_name ?? '—'}</Td>
                    <Td><Badge tone={STATUS_TONE[c.status] ?? 'slate'}>{STATUS_LABEL[c.status] ?? c.status}</Badge></Td>
                    <Td className="text-slate-500">{c.case_no ?? '—'}</Td>
                    <Td className="text-slate-500">{c.lawyer ?? '—'}</Td>
                    <Td className="text-right tabular-nums text-slate-500">{money(Number(c.debt_at_open), true)}</Td>
                    <Td className={`text-right tabular-nums ${Number(c.current_debt) > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}`}>{money(Number(c.current_debt), true)}</Td>
                    <Td className="text-slate-400">{date(c.opened_at)}</Td>
                    {!ro && (
                      <Td className="whitespace-nowrap text-right">
                        {c.status === 'takip' && (
                          <button onClick={() => changeStatus(c, 'icra')} className="text-xs text-red-600 hover:underline">İcraya Çevir</button>
                        )}
                        {c.status !== 'kapandi' && (
                          <button onClick={() => changeStatus(c, 'kapandi')} className="ml-3 text-xs text-slate-400 hover:text-slate-700">Kapat</button>
                        )}
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {openModal && (
        <Modal title="Takibe Al / İcra Aç" onClose={() => setOpenModal(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Borçlu Daire *">
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputCls}>
                <option value="">— Daire seçin —</option>
                {availableDebtors.map((d) => (
                  <option key={d.unit_id} value={d.unit_id}>
                    {unitLabel(d.block, d.apartment_number)} · borç {money(Number(d.net_borc), true)}
                  </option>
                ))}
              </select>
              {availableDebtors.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">Takibe alınabilecek borçlu daire yok (ya borç yok ya da tümü zaten dosyada).</p>
              )}
            </Field>
            <Field label="Durum">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="takip">Takibe Al (ön aşama)</option>
                <option value="icra">Doğrudan İcra</option>
              </select>
            </Field>
            <Field label="İcra Dosya No (opsiyonel)">
              <input value={caseNo} onChange={(e) => setCaseNo(e.target.value)} className={inputCls} placeholder="örn. 2026/1234" />
            </Field>
            <Field label="Avukat / Büro (opsiyonel)">
              <input value={lawyer} onChange={(e) => setLawyer(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Not (opsiyonel)">
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setOpenModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitOpen} disabled={busy || !unitId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Dosya Aç'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
