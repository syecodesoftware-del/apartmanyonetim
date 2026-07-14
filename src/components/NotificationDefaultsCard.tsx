'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card } from '@/components/ui';
import { Toggle } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import type { NotifyChannels } from '@/components/AccrualsForm';

const META: { key: keyof NotifyChannels; label: string; icon: string; hint?: string }[] = [
  { key: 'push', label: 'Uygulama Bildirimi', icon: '🔔' },
  { key: 'sms', label: 'SMS', icon: '💬', hint: 'sağlayıcı bekliyor' },
  { key: 'email', label: 'E-posta', icon: '✉️', hint: 'sağlayıcı bekliyor' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '🟢', hint: 'sağlayıcı bekliyor' },
];

/** Rapor Madde 8: site geneli varsayılan bildirim kanalları. Borç oluşturma ekranı bunu ön-seçili getirir. */
export function NotificationDefaultsCard({ siteId, initial }: { siteId: string; initial: NotifyChannels }) {
  const ro = useReadOnly();
  const [channels, setChannels] = useState<NotifyChannels>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setSaved(false);
    const { error } = await supabaseBrowser().from('notification_defaults').upsert(
      { site_id: siteId, channels: channels as unknown as never, updated_at: new Date().toISOString() },
      { onConflict: 'site_id' },
    );
    setBusy(false);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  return (
    <Card title="Varsayılan Bildirim Kanalları">
      <p className="mb-3 text-sm text-slate-600">
        Borç oluşturma ekranında bu kanallar ön-seçili gelir. Uygulama bildirimi anında gönderilir;
        SMS/e-posta/WhatsApp sağlayıcı bağlanınca gönderilmek üzere kuyruğa alınır.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {META.map((c) => (
          <label key={c.key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm text-slate-700">
              {c.icon} {c.label}
              {c.hint && <span className="ml-1 text-[10px] text-slate-400">({c.hint})</span>}
            </span>
            <Toggle checked={channels[c.key]} onChange={(v) => setChannels((s) => ({ ...s, [c.key]: v }))} disabled={ro} />
          </label>
        ))}
      </div>
      {!ro && (
        <div className="mt-3 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          {saved && <span className="text-sm text-emerald-600">✓ Kaydedildi</span>}
        </div>
      )}
    </Card>
  );
}
