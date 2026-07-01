'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { EmptyState } from '@/components/ui';
import { useReadOnly } from '@/components/ReadOnly';
import { ROLE_LABEL, date } from '@/lib/format';

export type PendingRow = {
  id: string;
  full_name: string;
  apartment_number: string | null;
  block: string | null;
  phone: string | null;
  email: string;
  tc_kimlik: string | null;
  role: string | null;
  created_at: string | null;
};

export function ApprovalsList({ pending }: { pending: PendingRow[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function approve(id: string) {
    setBusy(id);
    const { error } = await supabaseBrowser().functions.invoke('approve-resident', {
      body: { resident_id: id, action: 'approve' },
    });
    setBusy(null);
    if (error) { alert('Onaylanamadı: ' + error.message); return; }
    router.refresh();
  }

  async function reject(id: string) {
    if (!reason.trim()) { alert('Lütfen bir red gerekçesi yazın.'); return; }
    setBusy(id);
    const { error } = await supabaseBrowser().functions.invoke('approve-resident', {
      body: { resident_id: id, action: 'reject', rejection_reason: reason.trim() },
    });
    setBusy(null);
    if (error) { alert('Reddedilemedi: ' + error.message); return; }
    setRejecting(null); setReason('');
    router.refresh();
  }

  if (pending.length === 0) return <EmptyState>Bekleyen başvuru yok 🎉</EmptyState>;

  return (
    <ul className="divide-y divide-slate-100">
      {pending.map((r) => (
        <li key={r.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{r.full_name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[r.block, r.apartment_number].filter(Boolean).join(' / ') || 'Daire belirtilmemiş'}
                {' · '}{ROLE_LABEL[r.role ?? ''] ?? r.role ?? 'Sakin'}
                {' · '}{date(r.created_at)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {r.email}{r.phone ? ` · ${r.phone}` : ''}{r.tc_kimlik ? ` · TC: ${r.tc_kimlik}` : ''}
              </p>
            </div>
            {!ro && rejecting !== r.id && (
              <div className="flex gap-2">
                <button
                  onClick={() => approve(r.id)}
                  disabled={busy === r.id}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy === r.id ? '…' : 'Onayla'}
                </button>
                <button
                  onClick={() => { setRejecting(r.id); setReason(''); }}
                  disabled={busy === r.id}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Reddet
                </button>
              </div>
            )}
          </div>

          {!ro && rejecting === r.id && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Red gerekçesi…"
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
              />
              <button
                onClick={() => reject(r.id)}
                disabled={busy === r.id}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {busy === r.id ? '…' : 'Reddet'}
              </button>
              <button
                onClick={() => { setRejecting(null); setReason(''); }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Vazgeç
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
