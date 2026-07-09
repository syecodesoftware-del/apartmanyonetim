'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { dateTime } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type AssemblyRow = {
  id: string;
  title: string;
  kind: string;
  status: string;
  first_meeting_at: string | null;
  second_meeting_at: string | null;
  location: string | null;
  call_published_at: string | null;
  created_at: string;
  item_count: number;
};

export const ASM_STATUS: Record<string, { label: string; tone: 'slate' | 'blue' | 'green' | 'red' }> = {
  taslak: { label: 'Taslak', tone: 'slate' },
  cagri: { label: 'Çağrı Yayında', tone: 'blue' },
  tamamlandi: { label: 'Tamamlandı', tone: 'green' },
  iptal: { label: 'İptal', tone: 'red' },
};
export const KIND_LABEL: Record<string, string> = { olagan: 'Olağan', olaganustu: 'Olağanüstü' };

/** timestamptz için datetime-local input değeri üret */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AssembliesPanel({ canManage, assemblies: initial }: { canManage: boolean; assemblies: AssemblyRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AssemblyRow[]>(initial);
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('olagan');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [location, setLocation] = useState('');
  const [err, setErr] = useState('');

  async function reload() {
    const { data } = await supabaseBrowser().rpc('get_assemblies');
    setRows((data ?? []) as unknown as AssemblyRow[]);
  }

  async function submit() {
    if (!title.trim()) { setErr('Başlık girin.'); return; }
    setBusy(true); setErr('');
    const { data, error } = await supabaseBrowser().rpc('save_assembly', {
      p_id: null,
      p_title: title.trim(),
      p_kind: kind,
      p_first_meeting_at: first ? new Date(first).toISOString() : undefined,
      p_second_meeting_at: second ? new Date(second).toISOString() : undefined,
      p_location: location.trim() || undefined,
    });
    setBusy(false);
    if (error) { setErr(friendlyDbMessage(error.message)); return; }
    setOpen(false); setTitle(''); setKind('olagan'); setFirst(''); setSecond(''); setLocation('');
    await reload();
    router.push(`/assemblies/${data as string}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canManage && (
          <button onClick={() => { setErr(''); setOpen(true); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Toplantı Oluştur
          </button>
        )}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState>Henüz genel kurul kaydı yok. Sağ üstten toplantı oluşturun.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Toplantı</Th>
                  <Th>Tür</Th>
                  <Th>Tarih</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">Gündem</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <Td>
                      <Link href={`/assemblies/${a.id}`} className="font-medium text-blue-600 hover:underline">{a.title}</Link>
                      {a.location && <p className="text-xs text-slate-400">{a.location}</p>}
                    </Td>
                    <Td className="text-slate-500">{KIND_LABEL[a.kind] ?? a.kind}</Td>
                    <Td className="text-slate-500">{a.first_meeting_at ? dateTime(a.first_meeting_at) : '—'}</Td>
                    <Td><Badge tone={ASM_STATUS[a.status]?.tone ?? 'slate'}>{ASM_STATUS[a.status]?.label ?? a.status}</Badge></Td>
                    <Td className="text-right tabular-nums text-slate-500">{a.item_count}</Td>
                    <Td className="text-right">
                      <Link href={`/assemblies/${a.id}`} className="text-xs text-blue-600 hover:underline">Aç ›</Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {open && (
        <Modal title="Genel Kurul Toplantısı Oluştur" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Başlık *">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="örn. 2026 Olağan Genel Kurul" />
            </Field>
            <Field label="Tür">
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
                <option value="olagan">Olağan</option>
                <option value="olaganustu">Olağanüstü</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="1. Toplantı">
                <input type="datetime-local" value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} />
              </Field>
              <Field label="2. Toplantı (yeter sayı yoksa)">
                <input type="datetime-local" value={second} onChange={(e) => setSecond(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Yer">
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
            </Field>
            <p className="text-xs text-slate-400">Toplantı taslak olarak oluşturulur; gündem maddelerini ekledikten sonra çağrıyı yayınlayın (tüm sakinlere duyuru + bildirim gider).</p>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submit} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Oluşturuluyor…' : 'Oluştur'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export { toLocalInput };
