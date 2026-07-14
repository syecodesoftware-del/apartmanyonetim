'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState } from '@/components/ui';
import { inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { dateTime } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type DmThread = {
  resident_user_id: string;
  resident_name: string | null;
  unit_label: string | null;
  last_at: string;
  last_body: string;
  last_is_staff: boolean;
  unread: number;
};

type DmMessage = {
  id: string;
  body: string;
  sender_is_staff: boolean;
  created_at: string;
  read_at: string | null;
  sender_name: string | null;
};

export function MessagesPanel({ threads: initial }: { threads: DmThread[] }) {
  const ro = useReadOnly();
  const [threads, setThreads] = useState<DmThread[]>(initial);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const activeThread = threads.find((t) => t.resident_user_id === active) ?? null;
  const activeRef = useRef<string | null>(null);

  async function reloadThreads() {
    const { data } = await supabaseBrowser().rpc('get_dm_threads');
    setThreads((data ?? []) as unknown as DmThread[]);
    return (data ?? []) as unknown as DmThread[];
  }

  async function openThread(id: string) {
    setActive(id); activeRef.current = id; setErr('');
    const { data } = await supabaseBrowser().rpc('get_dm_thread', { p_resident_user_id: id });
    setMessages((data ?? []) as unknown as DmMessage[]);
    await reloadThreads(); // okundu sayaçları güncellensin
  }

  // Yeni mesajlar elle yenilemeden düşsün: 20 sn'de bir + sekme öne gelince tazele.
  useEffect(() => {
    let alive = true;
    async function tick() {
      if (!alive || document.hidden) return;
      const list = await reloadThreads();
      const cur = activeRef.current;
      // Açık konuşmaya yeni mesaj geldiyse mesajları da çek (ekranda açık → okundu sayılır)
      if (cur && list.some((t) => t.resident_user_id === cur && t.unread > 0)) {
        const { data } = await supabaseBrowser().rpc('get_dm_thread', { p_resident_user_id: cur });
        if (alive && activeRef.current === cur) setMessages((data ?? []) as unknown as DmMessage[]);
        await reloadThreads();
      }
    }
    const id = setInterval(tick, 20_000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendReply() {
    if (!active || !reply.trim()) return;
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('send_dm', { p_body: reply.trim(), p_resident_user_id: active });
    setBusy(false);
    if (error) { setErr(friendlyDbMessage(error.message)); return; }
    setReply('');
    await openThread(active);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Thread listesi */}
      <Card title={`Yazışmalar (${threads.length})`}>
        {threads.length === 0 ? (
          <EmptyState>Henüz mesaj yok. Sakinler mobil uygulamadan yazabilir.</EmptyState>
        ) : (
          <div className="flex flex-col gap-1">
            {threads.map((t) => (
              <button
                key={t.resident_user_id}
                onClick={() => openThread(t.resident_user_id)}
                className={`rounded-lg px-3 py-2.5 text-left transition ${active === t.resident_user_id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800">
                    {t.resident_name ?? '(isimsiz)'}{t.unit_label ? ` · ${t.unit_label}` : ''}
                  </span>
                  {t.unread > 0 && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">{t.unread}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {t.last_is_staff ? 'Siz: ' : ''}{t.last_body}
                </p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Aktif thread */}
      <Card title={activeThread ? `${activeThread.resident_name ?? ''}${activeThread.unit_label ? ` · ${activeThread.unit_label}` : ''}` : 'Mesajlar'}>
        {!active ? (
          <EmptyState>Soldan bir yazışma seçin.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm ${m.sender_is_staff ? 'self-end bg-blue-600 text-white' : 'self-start bg-slate-100 text-slate-800'}`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${m.sender_is_staff ? 'text-blue-200' : 'text-slate-400'}`}>
                    {m.sender_is_staff && m.sender_name ? `${m.sender_name} · ` : ''}{dateTime(m.created_at)}
                    {m.sender_is_staff && m.read_at ? ' · okundu ✓' : ''}
                  </p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-slate-400">Mesaj yok.</p>}
            </div>
            {!ro && (
              <div className="flex items-end gap-2 border-t border-slate-100 pt-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  className={`${inputCls} min-h-10 flex-1`}
                  rows={2}
                  placeholder="Yanıt yazın… (Enter ile gönder)"
                />
                <button onClick={sendReply} disabled={busy || !reply.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  Gönder
                </button>
              </div>
            )}
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
