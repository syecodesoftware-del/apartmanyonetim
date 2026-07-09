'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState } from '@/components/ui';
import { Modal } from '@/components/UnitsPanel';
import { Toggle } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { friendlyDbMessage } from '@/lib/error';

export type SiteInfo = {
  id: string; name: string; district: string | null; city: string | null;
  apartment_count: number | null; site_code: string; settings: Record<string, unknown> | null;
};
export type PendingMembership = { id: string; user_id: string; full_name: string; created_at: string | null };
export type EligibleResident = { id: string; full_name: string; block: string | null; apartment_number: string | null };

const FEATURES = [
  { key: 'enable_voting', label: 'Oylama', desc: 'Sakinler anket oluşturabilir' },
  { key: 'enable_booking', label: 'Rezervasyon', desc: 'Ortak alan rezervasyonu' },
  { key: 'enable_complaints', label: 'Şikayet', desc: 'Şikayet bildirimi aktif' },
  // enable_qr_payment: QR ödeme henüz üründe yok (Aşama 1.3 kararı, 2026-07-03) — özellik gelince geri eklenir
  { key: 'auto_approve_residents', label: 'Otomatik Onay', desc: 'Sakinler otomatik onaylanır' },
];

// B4-1 Sakin şeffaflık izinleri — açıldığında sakinler mobil uygulamada özeti görür (birim kırılımı YOK)
const TRANSPARENCY = [
  { key: 'transparency_income_expense', label: 'Gelir/Gider Özeti', desc: 'Sakinler bu yılın toplam tahsilat/gider/net özetini görür' },
  { key: 'transparency_cash_summary', label: 'Kasa/Banka Özeti', desc: 'Sakinler toplam kasa ve banka bakiyesini görür' },
];

export function SettingsPanel({ site, pending, eligible }: { site: SiteInfo | null; pending: PendingMembership[]; eligible: EligibleResident[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [settings, setSettings] = useState<Record<string, unknown>>(site?.settings ?? {});
  // K3: sunucudan gelen ayarlarla eşitle (iki sekme / yeniden yükleme senaryosu)
  useEffect(() => { setSettings(site?.settings ?? {}); }, [site?.id, site?.settings]);
  const [busy, setBusy] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  if (!site) return <Card><EmptyState>Site bilgisi bulunamadı.</EmptyState></Card>;

  async function toggle(key: string) {
    const prev = settings;
    const nextValue = !prev[key];
    setSettings({ ...prev, [key]: nextValue }); // iyimser güncelle
    // K3: tek anahtar sunucuda merge edilir (update_site_setting RPC) — bayat kopya tüm JSONB'yi ezemez
    const { data, error } = await supabaseBrowser().rpc('update_site_setting', {
      p_site_id: site!.id, p_key: key, p_value: nextValue,
    });
    if (error) { alert('Kaydedilemedi: ' + friendlyDbMessage(error.message)); setSettings(prev); return; }
    setSettings((data as Record<string, unknown> | null) ?? { ...prev, [key]: nextValue });
  }

  async function respondMembership(m: PendingMembership, approve: boolean) {
    if (!confirm(`${m.full_name} kişisinin talebi ${approve ? 'onaylansın' : 'reddedilsin'} mi?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('approve_site_membership', { p_membership_id: m.id, p_approve: approve });
    setBusy(false);
    if (error) { alert('İşlem başarısız: ' + error.message); return; }
    router.refresh();
  }

  async function transfer(r: EligibleResident) {
    if (!confirm(`${r.full_name} kişisine yöneticilik devredilsin mi?\n\nOnayladığında yönetici yetkisi ona geçer, siz sakin olursunuz.`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().functions.invoke('transfer-manager', {
      body: { action: 'initiate', to_resident_id: r.id },
    });
    setBusy(false);
    setTransferOpen(false);
    if (error) { alert('Devir talebi gönderilemedi: ' + error.message); return; }
    alert(`Talep gönderildi. ${r.full_name} onayladığında yetki ona geçecek.`);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Site bilgileri */}
      <Card title="Site Bilgileri">
        <dl className="space-y-2 text-sm">
          <Row label="Ad" value={site.name} />
          <Row label="Konum" value={[site.district, site.city].filter(Boolean).join(', ') || '—'} />
          <Row label="Daire Sayısı" value={String(site.apartment_count ?? '—')} />
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
            <span className="text-sm font-medium text-blue-700">Site Kodu</span>
            <span className="font-mono text-base font-bold tracking-widest text-blue-700">{site.site_code}</span>
          </div>
        </dl>
      </Card>

      {/* Özellikler */}
      <Card title="Site Özellikleri">
        <ul className="divide-y divide-slate-100">
          {FEATURES.map((f) => (
            <li key={f.key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{f.label}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
              {ro
                ? <span className={`text-xs font-semibold ${settings[f.key] ? 'text-emerald-600' : 'text-slate-400'}`}>{settings[f.key] ? 'Açık' : 'Kapalı'}</span>
                : <Toggle checked={!!settings[f.key]} onChange={() => toggle(f.key)} />}
            </li>
          ))}
        </ul>
      </Card>

      {/* B4-1 Sakin şeffaflığı */}
      <Card title="Sakin Şeffaflığı">
        <p className="mb-2 text-xs text-slate-400">
          Açtığınız bölümler sakinlerin mobil uygulamasında salt-okunur olarak görünür. Yalnızca site geneli toplamlar paylaşılır — kişi/daire bazlı bilgi paylaşılmaz.
        </p>
        <ul className="divide-y divide-slate-100">
          {TRANSPARENCY.map((f) => (
            <li key={f.key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{f.label}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
              {ro
                ? <span className={`text-xs font-semibold ${settings[f.key] ? 'text-emerald-600' : 'text-slate-400'}`}>{settings[f.key] ? 'Açık' : 'Kapalı'}</span>
                : <Toggle checked={!!settings[f.key]} onChange={() => toggle(f.key)} />}
            </li>
          ))}
        </ul>
      </Card>

      {/* Üyelik talepleri */}
      <Card title={`Bekleyen Site Talepleri${pending.length ? ` (${pending.length})` : ''}`}>
        {pending.length === 0 ? (
          <EmptyState>Bekleyen üyelik talebi yok.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-slate-800">{m.full_name}</span>
                {!ro && (
                  <div className="flex gap-2">
                    <button onClick={() => respondMembership(m, true)} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Onayla</button>
                    <button onClick={() => respondMembership(m, false)} disabled={busy} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">Reddet</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Yöneticilik devri — yalnız yönetici/admin */}
      {!ro && (
        <Card title="Yöneticiliği Devret">
          <p className="text-sm text-slate-500">Yönetici yetkisini başka bir sakine aktarın. Seçilen kişi onayladığında yetki ona geçer, siz sakin olursunuz.</p>
          <button onClick={() => setTransferOpen(true)} className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">Devret →</button>
        </Card>
      )}

      {transferOpen && (
        <Modal title="Kime Devredilsin?" onClose={() => setTransferOpen(false)}>
          <p className="mb-3 text-sm text-slate-500">Seçilen sakin onayladıktan sonra yönetici yetkisi ona geçer.</p>
          {eligible.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Devredilecek uygun sakin yok.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {eligible.map((r) => (
                <li key={r.id}>
                  <button onClick={() => transfer(r)} disabled={busy} className="flex w-full items-center justify-between py-2.5 text-left hover:bg-slate-50 disabled:opacity-60">
                    <span className="text-sm font-medium text-slate-800">{r.full_name}<span className="block text-xs text-slate-400">{[r.block, r.apartment_number].filter(Boolean).join(' / ') || 'Daire yok'}</span></span>
                    <span className="text-xs font-semibold text-amber-600">Devret</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
