'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Badge } from '@/components/ui';
import { dateTime } from '@/lib/format';

export type DeletionRequest = { id: string; status: string; reason: string | null; created_at: string } | null;

export function SiteDeletionCard({ pending }: { pending: DeletionRequest }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 3) { setError('Lütfen bir gerekçe yazın.'); return; }
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().rpc('request_site_deletion', { p_reason: reason.trim() });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOpen(false); setReason('');
    router.refresh();
  }

  async function cancel() {
    if (!pending) return;
    if (!window.confirm('Silme talebini geri çekmek istediğinize emin misiniz?')) return;
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().rpc('cancel_site_deletion_request', { p_request_id: pending.id });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <Card title="Site Silme Talebi">
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Siteyi doğrudan silemezsiniz. Silme talebi oluşturursunuz; platform yöneticisi inceleyip onaylarsa site
          <strong> pasife alınır (arşivlenir)</strong> ve erişiminiz kapanır. Bu işlem geri alınabilir bir arşivlemedir.
        </p>

        {pending ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Badge tone="amber">Onay bekliyor</Badge>
                <p className="mt-1 text-xs text-slate-500">Talep: {dateTime(pending.created_at)}</p>
                {pending.reason && <p className="mt-1 text-sm text-slate-700">Gerekçe: {pending.reason}</p>}
              </div>
              <button onClick={cancel} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-60">
                Talebi Geri Çek
              </button>
            </div>
          </div>
        ) : open ? (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Silme gerekçesi (örn. site yönetimi sonlandı)…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setOpen(false); setError(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button onClick={submit} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{busy ? 'Gönderiliyor…' : 'Silme Talebi Gönder'}</button>
            </div>
          </div>
        ) : (
          <>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button onClick={() => setOpen(true)} className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
              Site Silme Talebi Oluştur
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
