'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { dateTime } from '@/lib/format';

export type ComplaintRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  user_id: string | null;
  is_anonymous: boolean;
  created_at: string | null;
  user_name: string;
  user_unit: string;
};

type Status = 'open' | 'in_progress' | 'resolved' | 'rejected' | 'closed';
const STATUS: Record<Status, { label: string; tone: 'red' | 'amber' | 'green' | 'slate' }> = {
  open: { label: 'Açık', tone: 'red' },
  in_progress: { label: 'İşlemde', tone: 'amber' },
  resolved: { label: 'Çözüldü', tone: 'green' },
  rejected: { label: 'Reddedildi', tone: 'slate' },
  closed: { label: 'Kapatıldı', tone: 'slate' },
};
const ALL: Status[] = ['open', 'in_progress', 'resolved', 'rejected', 'closed'];
const PRIORITY: Record<string, string> = { low: 'Düşük', normal: 'Normal', high: 'Yüksek' };
const RESOLVED_SET = new Set<Status>(['resolved', 'rejected', 'closed']);

export function ComplaintsPanel({ complaints, managerId }: { complaints: ComplaintRow[]; managerId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [target, setTarget] = useState<ComplaintRow | null>(null);
  const [status, setStatus] = useState<Status>('open');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(c: ComplaintRow) {
    setTarget(c);
    setStatus((c.status as Status) ?? 'open');
    setNote(c.resolution_note ?? '');
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setError(null);
    if (RESOLVED_SET.has(status) && !note.trim()) { setError('Çözüm/karar notu yazın.'); return; }
    setSaving(true);
    const resolved = RESOLVED_SET.has(status);
    const patch: { status: Status; resolution_note: string | null; resolved_at: string | null; resolved_by: string | null } = {
      status,
      resolution_note: note.trim() || null,
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by: resolved ? managerId : null,
    };
    const { error } = await supabaseBrowser().from('complaints').update(patch).eq('id', target.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setTarget(null);
    router.refresh();
  }

  if (complaints.length === 0) return <Card><EmptyState>Henüz şikayet yok.</EmptyState></Card>;

  return (
    <>
      <div className="space-y-3">
        {complaints.map((c) => {
          const st = STATUS[(c.status as Status) ?? 'open'] ?? STATUS.open;
          return (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{c.title}</h3>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <Badge tone="blue">{c.category}</Badge>
                    {c.priority && <Badge tone={c.priority === 'high' ? 'red' : 'slate'}>{PRIORITY[c.priority] ?? c.priority}</Badge>}
                    {c.is_anonymous && <Badge tone="slate">🕶️ Anonim</Badge>}
                  </div>
                  {c.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{c.description}</p>}
                  <p className="mt-2 text-xs text-slate-400">{c.user_name}{c.user_unit ? ` · ${c.user_unit}` : ''} · {dateTime(c.created_at)}</p>
                  {c.resolution_note && (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><span className="font-semibold">Çözüm notu:</span> {c.resolution_note}</p>
                  )}
                </div>
                {!ro && <button onClick={() => open(c)} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Durumu Güncelle</button>}
              </div>
            </div>
          );
        })}
      </div>

      {target && (
        <Modal title="Şikayet Durumu" onClose={() => setTarget(null)}>
          <p className="mb-3 text-sm text-slate-500">{target.title}</p>
          <form onSubmit={save} className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Durum</p>
              <div className="flex flex-wrap gap-2">
                {ALL.map((s) => (
                  <button type="button" key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${status === s ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{STATUS[s].label}</button>
                ))}
              </div>
            </div>
            <Field label={RESOLVED_SET.has(status) ? 'Çözüm / Karar Notu *' : 'Not (opsiyonel)'}>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls} />
            </Field>
            <p className="text-xs text-slate-400">Durum değiştiğinde sakine otomatik bildirim gider.</p>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
