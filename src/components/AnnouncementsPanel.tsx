'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { Toggle } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { dateTime } from '@/lib/format';

export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  is_pinned: boolean | null;
  created_at: string | null;
  author_name: string | null;
};

type Priority = 'low' | 'normal' | 'high' | 'urgent';
const PRIORITIES: { key: Priority; label: string; tone: 'slate' | 'blue' | 'amber' | 'red' }[] = [
  { key: 'low', label: 'Bilgi', tone: 'slate' },
  { key: 'normal', label: 'Normal', tone: 'blue' },
  { key: 'high', label: 'Önemli', tone: 'amber' },
  { key: 'urgent', label: 'Acil', tone: 'red' },
];
const P = (k: string | null) => PRIORITIES.find((p) => p.key === k) ?? PRIORITIES[1];

export function AnnouncementsPanel({ announcements, siteId, managerId }: { announcements: AnnouncementRow[]; siteId: string; managerId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() { setTitle(''); setContent(''); setPriority('normal'); setIsPinned(false); setError(null); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError('Başlık zorunludur.'); return; }
    if (!content.trim()) { setError('İçerik zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabaseBrowser().from('announcements').insert({
      site_id: siteId, title: title.trim(), content: content.trim(), priority, is_pinned: isPinned, created_by: managerId,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    router.refresh();
  }

  async function remove(a: AnnouncementRow) {
    if (!confirm(`"${a.title}" duyurusu silinsin mi?`)) return;
    const { error } = await supabaseBrowser().from('announcements').delete().eq('id', a.id);
    if (error) { alert('Silinemedi: ' + error.message); return; }
    router.refresh();
  }

  async function togglePin(a: AnnouncementRow) {
    const { error } = await supabaseBrowser().from('announcements').update({ is_pinned: !a.is_pinned }).eq('id', a.id);
    if (error) { alert('Güncellenemedi: ' + error.message); return; }
    router.refresh();
  }

  return (
    <>
      {!ro && (
        <div className="mb-4">
          <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">+ Yeni Duyuru</button>
        </div>
      )}

      {announcements.length === 0 ? (
        <Card><EmptyState>Henüz duyuru yok.</EmptyState></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const p = P(a.priority);
            return (
              <div key={a.id} className={`rounded-xl border bg-white p-4 ${a.is_pinned ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {a.is_pinned && <span title="Sabit">📌</span>}
                      <h3 className="text-sm font-bold text-slate-800">{a.title}</h3>
                      <Badge tone={p.tone}>{p.label}</Badge>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.content}</p>
                    <p className="mt-2 text-xs text-slate-400">{a.author_name ?? 'Yönetici'} · {dateTime(a.created_at)}</p>
                  </div>
                  {!ro && (
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button onClick={() => togglePin(a)} className="text-xs font-semibold text-blue-600 hover:underline">{a.is_pinned ? 'Sabiti kaldır' : 'Sabitle'}</button>
                      <button onClick={() => remove(a)} className="text-xs font-semibold text-red-600 hover:underline">Sil</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal title="Yeni Duyuru" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Başlık *"><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Örn: Asansör Bakımı" className={inputCls} /></Field>
            <Field label="İçerik *"><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} className={inputCls} /></Field>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Öncelik</p>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <button type="button" key={p.key} onClick={() => setPriority(p.key)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${priority === p.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{p.label}</button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {priority === 'urgent'
                  ? '\ud83d\udea8 Acil duyuru: bildirim tercihlerinden ba\u011f\u0131ms\u0131z olarak t\u00fcm sakinlere an\u0131nda bildirim g\u00f6nderilir. Yaln\u0131zca ger\u00e7ek acil durumlarda kullan\u0131n.'
                  : 'Duyuru yay\u0131nland\u0131\u011f\u0131nda sakinlere bildirim g\u00f6nderilir (bildirimi kapatanlar hari\u00e7).'}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-700">Duyuruyu sabitle <span className="text-slate-400">(en üstte gösterilir)</span></span>
              <Toggle checked={isPinned} onChange={setIsPinned} />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Yayınlanıyor…' : 'Yayınla'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
