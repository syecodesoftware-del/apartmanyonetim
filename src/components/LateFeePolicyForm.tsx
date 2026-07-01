'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card } from '@/components/ui';
import { Field, inputCls } from '@/components/UnitsPanel';
import { Segmented } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';

type Mode = 'aylik' | 'gunluk_bilesik';
const MODE_LABEL: Record<Mode, string> = { aylik: 'Aylık', gunluk_bilesik: 'Günlük (Bileşik)' };

// Oran KMK m.20 gereği sabit %5'tir (DB'de trigger ile kilitli). Form yalnız mod + grace yönetir.
export function LateFeePolicyForm({ siteId, initialGrace, initialMode }: { siteId: string; initialGrace: number; initialMode: Mode }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [grace, setGrace] = useState(String(initialGrace));
  const [mode, setMode] = useState<Mode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaved(false);
    const g = Number(grace);
    if (isNaN(g) || g < 0) { setError('Geçerli bir gün sayısı giriniz.'); return; }
    setSaving(true);
    const { error } = await supabaseBrowser().from('late_fee_policies').upsert({
      site_id: siteId,
      oran_aylik: 0.05, // KMK m.20 — DB trigger zaten 0.05'e zorlar
      grace_days: Math.round(g),
      hesaplama_modu: mode,
      gunluk_bolme: 'ay_gun_sayisi',
      yuvarlama: 'kurus',
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    router.refresh();
  }

  if (ro) {
    return (
      <div className="max-w-md">
        <Card>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><dt className="text-slate-500">Aylık Gecikme Oranı</dt><dd className="font-semibold text-slate-800">%5 (KMK m.20)</dd></div>
            <div className="flex items-center justify-between"><dt className="text-slate-500">Hesaplama Modu</dt><dd className="font-semibold text-slate-800">{MODE_LABEL[mode]}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-slate-500">Ödemesiz Gün (grace)</dt><dd className="font-semibold text-slate-800">{grace}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-400">Denetçi modunda politika değiştirilemez.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Aylık Gecikme Oranı</p>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-lg font-bold text-slate-800">%5</span>
              <span className="text-xs text-slate-400">KMK m.20 — kanunen sabit, değiştirilemez</span>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Hesaplama Modu</p>
            <Segmented value={mode} onChange={setMode} options={[{ value: 'aylik', label: 'Aylık' }, { value: 'gunluk_bilesik', label: 'Günlük (Bileşik)' }]} />
            <p className="mt-1.5 text-xs text-slate-400">
              {mode === 'gunluk_bilesik'
                ? 'Vade+grace sonrası her gün bileşik işler (günlük oran = %5 ÷ ayın gün sayısı).'
                : 'Vade+grace sonrası her tamamlanan ay için %5 basit tazminat işler.'}
            </p>
          </div>

          <Field label="Ödemesiz Gün (grace)">
            <input value={grace} onChange={(e) => setGrace(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputCls} />
          </Field>
          <p className="-mt-2 text-xs text-slate-400">Vadeden sonra bu kadar gün gecikme işletilmez. Varsayılan: 0.</p>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {saved && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ Politika kaydedildi.</p>}

          <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </form>
      </Card>
    </div>
  );
}
