'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';

/** Cari ekstrede tahakkuk satırı için "Vazgeç" / "Geri Al" aksiyonu (Modül 3e).
 *  Denetçi (readOnly) yalnız "vazgeçildi" etiketini görür, aksiyon yok. */
export function WaiveControls({ accrualId, durum }: { accrualId: string; durum: string | null }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  if (ro) return durum === 'waived' ? <span className="text-xs text-slate-400">vazgeçildi</span> : null;

  async function submitWaive() {
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('waive_accrual', { p_accrual_id: accrualId, p_reason: reason.trim() || undefined });
    setBusy(false);
    if (error) { setErr('Vazgeçilemedi: ' + error.message); return; }
    setOpen(false); setReason('');
    router.refresh();
  }

  async function unwaive() {
    if (!window.confirm('Bu vazgeçilen alacağı geri almak istiyor musunuz? Borç yeniden aktif olur.')) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('unwaive_accrual', { p_accrual_id: accrualId });
    setBusy(false);
    if (error) { window.alert('Geri alınamadı: ' + error.message); return; }
    router.refresh();
  }

  if (durum === 'waived') {
    return <button onClick={unwaive} disabled={busy} className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60">Geri Al</button>;
  }
  if (durum === 'open' || durum === 'partial') {
    return (
      <>
        <button onClick={() => { setReason(''); setErr(''); setOpen(true); }} disabled={busy} className="text-xs font-semibold text-amber-600 hover:underline disabled:opacity-60">Vazgeç</button>
        {open && (
          <Modal title="Alacaktan Vazgeç" onClose={() => setOpen(false)}>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">Bu borç kalemi silinmez; &quot;vazgeçildi&quot; olarak işaretlenir ve istenirse geri alınabilir.</p>
              <Field label="Vazgeçme sebebi (opsiyonel, denetim izi için kaydedilir)">
                <input value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitWaive()} className={inputCls} placeholder="örn. genel kurul kararı 2026/4" autoFocus />
              </Field>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
                <button onClick={submitWaive} disabled={busy} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                  {busy ? '…' : 'Vazgeç'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }
  return null;
}
