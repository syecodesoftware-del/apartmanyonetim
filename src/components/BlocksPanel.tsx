'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';

export type BlockRow = { id: string; name: string; manager_user_id: string | null; manager_name: string | null; unit_count: number };
export type Member = { id: string; full_name: string; role: string | null };

export function BlocksPanel({ blocks, members, siteId }: { blocks: BlockRow[]; members: Member[]; siteId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() { setEditId(null); setName(''); setManagerId(''); setError(null); setOpen(true); }
  function openEdit(b: BlockRow) { setEditId(b.id); setName(b.name); setManagerId(b.manager_user_id ?? ''); setError(null); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Ada adı zorunludur.'); return; }
    setSaving(true);
    const sb = supabaseBrowser();
    const payload = { name: name.trim(), manager_user_id: managerId || null };
    const { error } = editId
      ? await sb.from('blocks').update(payload).eq('id', editId)
      : await sb.from('blocks').insert({ site_id: siteId, ...payload });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    router.refresh();
  }

  async function remove(b: BlockRow) {
    const msg = b.unit_count > 0
      ? `"${b.name}" silinsin mi? ${b.unit_count} daire bu adaya bağlı; bağları boşalır (daireler silinmez).`
      : `"${b.name}" silinsin mi?`;
    if (!confirm(msg)) return;
    const { error } = await supabaseBrowser().from('blocks').delete().eq('id', b.id);
    if (error) { alert('Silinemedi: ' + error.message); return; }
    router.refresh();
  }

  return (
    <>
      <Card title="Ada Listesi" action={ro ? undefined : <button onClick={openNew} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ Ada</button>}>
        {blocks.length === 0 ? (
          <EmptyState>Henüz ada eklenmedi.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr><Th>Ada Adı</Th><Th>Atanan Yönetici</Th><Th className="text-right">Daire</Th><Th className="text-right">İşlem</Th></tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">{b.name}</Td>
                  <Td>{b.manager_name ?? <span className="text-slate-400">—</span>}</Td>
                  <Td className="text-right"><Badge tone="slate">{b.unit_count}</Badge></Td>
                  <Td className="text-right">
                    {!ro && (
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(b)} className="text-xs font-semibold text-blue-600 hover:underline">Düzenle</button>
                        <button onClick={() => remove(b)} className="text-xs font-semibold text-red-600 hover:underline">Sil</button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {open && (
        <Modal title={editId ? 'Adayı Düzenle' : 'Yeni Ada'} onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Ada Adı *"><input value={name} onChange={(e) => setName(e.target.value)} autoFocus className={inputCls} /></Field>
            <Field label="Atanan Yönetici (görüntüleme amaçlı)">
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputCls}>
                <option value="">Atanmadı</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
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
