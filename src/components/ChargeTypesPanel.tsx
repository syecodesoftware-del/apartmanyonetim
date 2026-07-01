'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { Toggle, Segmented } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';

export type ChargeTypeRow = {
  id: string;
  ad: string;
  borc_hedefi: string;
  gecikme_uygula: boolean;
  is_icra: boolean;
  is_active: boolean;
};

type Form = { ad: string; borc_hedefi: 'malik' | 'kiraci'; gecikme_uygula: boolean; is_icra: boolean };
const empty: Form = { ad: '', borc_hedefi: 'kiraci', gecikme_uygula: true, is_icra: false };

export function ChargeTypesPanel({ chargeTypes, siteId }: { chargeTypes: ChargeTypeRow[]; siteId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() { setEditId(null); setForm({ ...empty }); setError(null); setOpen(true); }
  function openEdit(c: ChargeTypeRow) {
    setEditId(c.id);
    setForm({ ad: c.ad, borc_hedefi: c.borc_hedefi as 'malik' | 'kiraci', gecikme_uygula: c.gecikme_uygula, is_icra: c.is_icra });
    setError(null); setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.ad.trim()) { setError('Ad zorunludur.'); return; }
    setSaving(true);
    const sb = supabaseBrowser();
    const payload = { ad: form.ad.trim(), borc_hedefi: form.borc_hedefi, gecikme_uygula: form.gecikme_uygula, is_icra: form.is_icra };
    const { error } = editId
      ? await sb.from('charge_types').update(payload).eq('id', editId)
      : await sb.from('charge_types').insert({ site_id: siteId, ...payload });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    router.refresh();
  }

  async function toggleActive(c: ChargeTypeRow) {
    const { error } = await supabaseBrowser().from('charge_types').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) { alert('Güncellenemedi: ' + error.message); return; }
    router.refresh();
  }

  return (
    <>
      <Card title="Gider Türleri" action={ro ? undefined : <button onClick={openNew} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ Tür</button>}>
        {chargeTypes.length === 0 ? (
          <EmptyState>Henüz gider türü yok. Örnek: “Aidat”, “Yakıt”.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr><Th>Ad</Th><Th>Borç Hedefi</Th><Th>Özellikler</Th><Th>Aktif</Th><Th className="text-right">İşlem</Th></tr>
            </thead>
            <tbody>
              {chargeTypes.map((c) => (
                <tr key={c.id} className={`hover:bg-slate-50 ${!c.is_active ? 'opacity-50' : ''}`}>
                  <Td className="font-medium text-slate-800">{c.ad}</Td>
                  <Td>{c.borc_hedefi === 'malik' ? 'Malik' : 'Kiracı'}</Td>
                  <Td>
                    <div className="flex gap-1">
                      {c.gecikme_uygula ? <Badge tone="amber">Gecikme</Badge> : <span className="text-slate-300">—</span>}
                    </div>
                  </Td>
                  <Td>{ro ? <Badge tone={c.is_active ? 'blue' : 'slate'}>{c.is_active ? 'Aktif' : 'Pasif'}</Badge> : <Toggle checked={c.is_active} onChange={() => toggleActive(c)} />}</Td>
                  <Td className="text-right">{!ro && <button onClick={() => openEdit(c)} className="text-xs font-semibold text-blue-600 hover:underline">Düzenle</button>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {open && (
        <Modal title={editId ? 'Türü Düzenle' : 'Yeni Gider Türü'} onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Ad (ör. Aidat, Yakıt)"><input value={form.ad} onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))} autoFocus className={inputCls} /></Field>
            <Field label="Borç hedefi">
              <Segmented value={form.borc_hedefi} onChange={(v) => setForm((f) => ({ ...f, borc_hedefi: v }))} options={[{ value: 'kiraci', label: 'Kiracı' }, { value: 'malik', label: 'Malik' }]} />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-700">Gecikme tazminatı uygula</span>
              <Toggle checked={form.gecikme_uygula} onChange={(v) => setForm((f) => ({ ...f, gecikme_uygula: v }))} />
            </div>
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
