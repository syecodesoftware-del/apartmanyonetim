'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { useReadOnly } from '@/components/ReadOnly';

/** Cari ekstrede tahakkuk satırı için "Vazgeç" / "Geri Al" aksiyonu (Modül 3e).
 *  Denetçi (readOnly) yalnız "vazgeçildi" etiketini görür, aksiyon yok. */
export function WaiveControls({ accrualId, durum }: { accrualId: string; durum: string | null }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [busy, setBusy] = useState(false);

  if (ro) return durum === 'waived' ? <span className="text-xs text-slate-400">vazgeçildi</span> : null;

  async function waive() {
    const reason = window.prompt('Vazgeçme sebebi (opsiyonel, audit için kaydedilir):');
    if (reason === null) return; // iptal
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('waive_accrual', { p_accrual_id: accrualId, p_reason: reason.trim() || undefined });
    setBusy(false);
    if (error) { window.alert('Vazgeçilemedi: ' + error.message); return; }
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
    return <button onClick={waive} disabled={busy} className="text-xs font-semibold text-amber-600 hover:underline disabled:opacity-60">Vazgeç</button>;
  }
  return null;
}
